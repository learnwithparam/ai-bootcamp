import {
  AudioFrame,
  AudioSource,
  LocalAudioTrack,
  Room,
  RoomEvent,
  TrackPublishOptions,
  TrackSource,
} from "@livekit/rtc-node";
import { POST } from "../app/api/call/route";

// A caller for the tests: it places a call through the site's own route, joins the room like a browser,
// and speaks recorded lines (tests/voices, made with macOS `say`) into a microphone track at real speed.
// Between lines it waits its turn, the way a person does: until the agent has spoken and is listening again.

const RATE = 16_000;
const FRAME = RATE / 100;

function samplesOf(wav: ArrayBuffer): Int16Array {
  const view = new DataView(wav);
  for (let at = 12; at < view.byteLength - 8; ) {
    const id = String.fromCharCode(...new Uint8Array(wav, at, 4));
    const size = view.getUint32(at + 4, true);
    if (id === "data") return new Int16Array(wav.slice(at + 8, at + 8 + size));
    at += 8 + size + (size % 2);
  }
  throw new Error("The recording has no audio in it.");
}

export type Caller = {
  callId: string;
  say: (line: string) => Promise<void>;
  hangUp: () => Promise<void>;
  ended: Promise<void>;
};

// Places the call through the site's own route, as the Call button does.
async function ring(callerId: string) {
  const response = await POST(
    new Request("http://localhost/api/call", {
      method: "POST",
      headers: { cookie: `harbour_caller=${callerId}` },
    }),
  );
  const answer = (await response.json()) as {
    callId?: string;
    url?: string;
    token?: string;
    blocked?: string;
  };
  if (!answer.callId || !answer.url || !answer.token)
    throw new Error(`The call was not placed: ${answer.blocked}`);
  return { callId: answer.callId, url: answer.url, token: answer.token };
}

type Seen = { state: string; changes: number; over: boolean };

// The agent's state as LiveKit publishes it, and how many times it has changed.
function watchAgent(room: Room): Seen {
  const seen = { state: "initializing", changes: 0, over: false };
  room.on(RoomEvent.ParticipantAttributesChanged, (_changed, participant) => {
    const state = participant.attributes["lk.agent.state"];
    if (state && state !== seen.state) Object.assign(seen, { state, changes: seen.changes + 1 });
  });
  return seen;
}

// Waits until the agent has had its say and has been listening for a moment, so a reply in two parts is not cut.
async function myTurn(seen: Seen, since: number) {
  const deadline = Date.now() + 45_000;
  let quietSince = 0;
  while (Date.now() < deadline && !seen.over) {
    const listening = seen.state === "listening" && seen.changes > since;
    quietSince = listening ? quietSince || Date.now() : 0;
    if (quietSince && Date.now() - quietSince > 2500) return;
    await Bun.sleep(100);
  }
  if (!seen.over) throw new Error(`The agent did not finish its turn. It is ${seen.state}.`);
}

async function speak(seen: Seen, source: AudioSource, samples: Int16Array) {
  for (let at = 0; at < samples.length && !seen.over; at += FRAME) {
    const frame = new Int16Array(FRAME);
    frame.set(samples.subarray(at, at + FRAME));
    await source.captureFrame(new AudioFrame(frame, RATE, 1, FRAME));
  }
}

export async function placeCall(callerId: string): Promise<Caller> {
  const answer = await ring(callerId);
  const room = new Room();
  const seen = watchAgent(room);
  const ended = new Promise<void>((resolve) => room.on(RoomEvent.Disconnected, () => resolve()));
  ended.then(() => (seen.over = true));
  await room.connect(answer.url, answer.token, { autoSubscribe: true, dynacast: false });
  const source = new AudioSource(RATE, 1);
  const options = Object.assign(new TrackPublishOptions(), { source: TrackSource.SOURCE_MICROPHONE });
  await room.localParticipant?.publishTrack(LocalAudioTrack.createAudioTrack("microphone", source), options);

  await myTurn(seen, 0);
  return {
    callId: answer.callId,
    ended,
    async say(line: string) {
      if (seen.over) return;
      const before = seen.changes;
      const wav = await Bun.file(new URL(`./voices/${line}.wav`, import.meta.url)).arrayBuffer();
      await speak(seen, source, samplesOf(wav));
      await speak(seen, source, new Int16Array(RATE));
      await myTurn(seen, before);
    },
    async hangUp() {
      await room.disconnect();
    },
  };
}
