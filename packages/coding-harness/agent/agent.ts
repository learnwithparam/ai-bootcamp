import { model } from "@bootcamp/model";
import { type LanguageModelUsage, type ModelMessage, streamText } from "ai";
import { type Outcome, type SessionEvent, settle } from "../rules/session";
import { type Ask, handleCall, type Run } from "./call";
import { changesSoFar, runCheck } from "./check";
import { reasonToStop } from "./extensions";
import template from "./prompt.md" with { type: "text" };
import { skillList } from "./skills";
import { TOOLS } from "./tools/all";

// The whole harness: a loop of one model call, then the tools it asked for, until the check passes.
// Read it top to bottom. There is no framework loop underneath, so every rule is a line you can see here.

export type Task = {
  task: string;
  repo: string;
  commit: string;
  name: string;
  check: string;
  maxSteps?: number;
};
export type Ending = { outcome: Outcome; reason: string };

// What a terminal app adds to a run. `bun run code` passes none of these, and the run is the same loop.
// ask lets a person say no to a call, onText shows the model's words as they arrive, and signal stops the run.
export type Live = { ask?: Ask; onText?: (text: string) => void; signal?: AbortSignal };

const STOPPED: Ending = { outcome: "stopped", reason: "You stopped the run." };

const now = () => new Date().toISOString();
const costOf = (usage: LanguageModelUsage) => (usage.raw as { cost?: number } | undefined)?.cost ?? 0;

function instructions(check: string): string {
  return template.replace("{{check}}", check).replace("{{skills}}", skillList());
}

// One turn: ask the model, write down what it said and cost, then run each tool call it made.
// The words stream to onText as they arrive; the session file gets them once, whole.
async function ask(messages: ModelMessage[], run: Run, live: Live) {
  const result = streamText({
    model: model(),
    system: instructions(run.check),
    messages,
    tools: TOOLS,
    abortSignal: live.signal,
    experimental_telemetry: { isEnabled: true, functionId: "coding-agent.turn" },
  });
  for await (const text of result.textStream) live.onText?.(text);
  const [text, toolCalls, usage, response] = await Promise.all([
    result.text,
    result.toolCalls,
    result.usage,
    result.response,
  ]);
  return { text, toolCalls, usage, responseMessages: response.messages };
}

async function turn(
  messages: ModelMessage[],
  run: Run,
  cost: number,
  live: Live,
): Promise<{ cost: number; ending?: Ending }> {
  const result = await ask(messages, run, live);
  const spent = cost + costOf(result.usage);
  run.record({
    type: "usage",
    at: now(),
    step: run.step,
    cost: costOf(result.usage),
    tokens: result.usage.totalTokens ?? 0,
  });
  if (result.text.trim())
    run.record({ type: "thought", at: now(), step: run.step, text: result.text.trim() });
  messages.push(...result.responseMessages);
  if (result.toolCalls.length === 0) {
    messages.push({
      role: "user",
      content: "Use a tool to keep working, or call done when the check should pass.",
    });
    return { cost: spent };
  }
  const answers = [];
  for (const call of result.toolCalls) answers.push(await handleCall(call, run));
  messages.push({ role: "tool", content: answers.map((each) => each.part) });
  if (!answers.some((each) => each.passed)) return { cost: spent };
  return {
    cost: spent,
    ending: { outcome: "passed", reason: "The agent said it was done, and every test in the check passes." },
  };
}

async function loop(task: Task, run: Run, live: Live): Promise<Ending> {
  const messages: ModelMessage[] = [{ role: "user", content: task.task }];
  const maxSteps = task.maxSteps ?? 30;
  let cost = 0;
  for (run.step = 1; run.step <= maxSteps; run.step++) {
    if (live.signal?.aborted) return STOPPED;
    const next = await turn(messages, run, cost, live);
    cost = next.cost;
    if (next.ending) return next.ending;
    const stop = reasonToStop({ step: run.step, cost });
    if (stop) return { outcome: "stopped", reason: stop };
  }
  const after = await runCheck(task.check, task.repo);
  run.record({ type: "check", at: now(), step: maxSteps, result: after });
  const state = after.passed
    ? "The check passes, but the agent never said it was done."
    : "The check still fails.";
  return { outcome: "out_of_steps", reason: `Used all ${maxSteps} steps. ${state}` };
}

// Runs one task in one repo and writes every event to record, which the CLI saves as the session file.
export async function runAgent(
  task: Task,
  record: (event: SessionEvent) => void,
  live: Live = {},
): Promise<Ending> {
  record({
    type: "start",
    at: now(),
    task: task.task,
    repo: task.name,
    commit: task.commit,
    check: task.check,
  });
  record({ type: "check_before", at: now(), result: await runCheck(task.check, task.repo) });
  const run: Run = { repo: task.repo, check: task.check, step: 0, record, ask: live.ask };
  // Stopping cancels the model call in flight, which throws. Any other error is a real failure.
  const finished = await loop(task, run, live).catch((error: Error) => {
    if (live.signal?.aborted) return STOPPED;
    throw error;
  });
  const diff = await changesSoFar(task.repo);
  const ending = settle(finished.outcome, finished.reason, diff);
  record({ type: "end", at: now(), ...ending, diff });
  return ending;
}
