import { fileURLToPath } from "node:url";
import { required } from "@bootcamp/model";
import { cli, defineAgent, inference, type JobContext, ServerOptions, voice } from "@livekit/agents";
import { audioEnhancement, EnhancerModel } from "@livekit/plugins-ai-coustics";
import { RoomServiceClient } from "livekit-server-sdk";
import { settleCall } from "../db/calls";
import { allPhysios } from "../db/diary";
import { addLine, findCall } from "../db/queries";
import { AGENT_NAME } from "../rules/clinic";
import {
  addUsage,
  type CallUsage,
  callCost,
  LANGUAGE_MODEL,
  NO_USAGE,
  SPEECH_TO_TEXT,
  TEXT_TO_SPEECH,
} from "../rules/cost";
import { CALL_SECONDS, REPLY_TOKENS } from "../rules/limits";
import type { Physio } from "../rules/slots";
import { GOODBYE, GREETING, promptFor, TIME_UP } from "./prompt";
import { type CallState, callTools } from "./tools";

// The phone line, built on LiveKit's agent-starter-node: the same models and the same pipeline.
// LiveKit sends this worker one job per call; the job joins the call's room, listens, thinks and speaks.
// Every model runs on LiveKit Inference, so the LiveKit keys are the only ones it needs.
// `bun 03-voice-assistant/agent/worker.ts dev` starts it; `bun run dev voice-assistant` starts it with the site.

type Metric = {
  type: string;
  audioDurationMs?: number;
  charactersCount?: number;
  promptTokens?: number;
  promptCachedTokens?: number;
  completionTokens?: number;
};

// What one metric adds to the call's usage. Speech heard is billed by the second, speech said by the character.
function usageOf(metric: Metric): Partial<CallUsage> {
  if (metric.type === "stt_metrics") return { heardSeconds: (metric.audioDurationMs ?? 0) / 1000 };
  if (metric.type === "tts_metrics") return { spokenCharacters: metric.charactersCount ?? 0 };
  if (metric.type === "llm_metrics")
    return {
      promptTokens: metric.promptTokens ?? 0,
      cachedTokens: metric.promptCachedTokens ?? 0,
      completionTokens: metric.completionTokens ?? 0,
    };
  return {};
}

function newSession(physios: Physio[]) {
  return new voice.AgentSession({
    stt: new inference.STT({ model: SPEECH_TO_TEXT.model, language: "en" }),
    // The clinic's own words, which speech to text would otherwise misspell. Detection adds the
    // caller's name once the call has heard it clearly.
    keytermsOptions: {
      keyterms: ["Harbour Physio", "physio", ...physios.map((physio) => physio.name)],
      keytermDetection: { enabled: true },
    },
    tts: new inference.TTS({ model: TEXT_TO_SPEECH.model, voice: TEXT_TO_SPEECH.voice }),
    turnHandling: {
      // LiveKit's turn detector listens to the caller's audio, so a pause between the groups of a
      // phone number is not taken for the end of a turn.
      turnDetection: new inference.TurnDetector(),
      preemptiveGeneration: { enabled: true },
    },
    // The model adds delivery tags (warmth, pace) that Fish Audio speaks and the transcript never shows.
    expressive: true,
  });
}

// Writes each finished line of the call to Postgres, so the front desk reads it as it happens.
function keepTranscript(session: voice.AgentSession, state: CallState) {
  session.on(voice.AgentSessionEventTypes.ConversationItemAdded, ({ item }) => {
    if (item.type !== "message" || !item.textContent) return;
    if (item.role === "user") state.callerTurns += 1;
    const role = item.role === "user" ? "caller" : "agent";
    addLine(state.callId, role, item.textContent).catch((error) =>
      console.error("A transcript line was not saved:", error),
    );
  });
}

// The agent of LiveKit's starter, made with Agent.create: our instructions, the starter's model, our tools.
function newAgent(state: CallState) {
  return voice.Agent.create({
    instructions: promptFor(new Date(), state.physios),
    llm: new inference.LLM({
      model: LANGUAGE_MODEL.model,
      modelOptions: { max_completion_tokens: REPLY_TOKENS },
    }),
    tools: callTools(state),
  });
}

// Settles the ledger with what the call really cost, notes why it ended, and closes the room.
async function endCall(
  ctx: JobContext,
  state: CallState,
  spent: { seconds: number; costUsd: number; usage: CallUsage },
) {
  const because = state.endedBecause ?? "caller hung up";
  await settleCall(state.callId, { ...spent, because });
  await addLine(state.callId, "tool", `Call ended: ${because}.`);
  await rooms()
    .deleteRoom(ctx.room.name ?? "")
    .catch((error) => console.error("The room was not closed:", error));
}

// Fifteen seconds before the limit, the agent says the call must end, then hangs up.
function limitTime(session: voice.AgentSession, state: CallState) {
  return setTimeout(
    () => {
      state.endedBecause = "five minute limit";
      session.say(TIME_UP, { allowInterruptions: false });
      setTimeout(() => session.shutdown({ drain: true }), 12_000);
    },
    (CALL_SECONDS - 15) * 1000,
  );
}

async function startCall(ctx: JobContext, callId: string) {
  const physios = await allPhysios();
  const session = newSession(physios);
  let usage = NO_USAGE;
  session.on(voice.AgentSessionEventTypes.MetricsCollected, ({ metrics }) => {
    usage = addUsage(usage, usageOf(metrics as Metric));
  });
  const state: CallState = {
    callId,
    physios,
    callerTurns: 0,
    now: () => new Date(),
    end: () => {
      session.say(GOODBYE, { allowInterruptions: false });
      session.shutdown({ drain: true });
    },
  };
  keepTranscript(session, state);
  const started = Date.now();
  const timeUp = limitTime(session, state);
  ctx.addShutdownCallback(async () => {
    clearTimeout(timeUp);
    const seconds = Math.round((Date.now() - started) / 1000);
    await endCall(ctx, state, { seconds, costUsd: callCost(usage, seconds), usage });
  });
  session.on(voice.AgentSessionEventTypes.Close, () => ctx.shutdown("session closed"));
  await session.start({
    agent: newAgent(state),
    room: ctx.room,
    // ai-coustics voice isolation, as in the starter: the caller's voice, without the room behind them.
    inputOptions: { noiseCancellation: audioEnhancement({ model: EnhancerModel.QuailVfS }) },
  });
  await ctx.connect();
  session.say(GREETING);
}

function rooms() {
  const url = required("LIVEKIT_URL").replace("wss://", "https://");
  return new RoomServiceClient(url, required("LIVEKIT_API_KEY"), required("LIVEKIT_API_SECRET"));
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const { callId } = JSON.parse(ctx.job.metadata || "{}") as { callId?: string };
    const call = callId ? await findCall(callId) : null;
    // Only a call the site placed and counted is answered. Anything else is closed without a word.
    if (call?.status !== "live") {
      ctx.shutdown("not a call the site placed");
      return;
    }
    await startCall(ctx, call.id);
  },
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url), agentName: AGENT_NAME }));
}
