import type { ToolResultPart } from "ai";
import type { CheckResult } from "../rules/check";
import { type Permission, permissionFor, SAID_NO } from "../rules/permission";
import type { SessionEvent } from "../rules/session";
import { runCheck } from "./check";
import { refusal } from "./extensions";
import { runTool } from "./tools/all";

// One tool call, from the model's request to the answer it reads back.
// Order matters: the extensions may refuse first, then a person may say no, then the tool runs,
// then the event is written down.

export type AskRequest = Permission & { tool: string; input: Record<string, unknown> };
// Answers true to let the call run. Without it, as in `bun run code`, every call the rules allow runs.
export type Ask = (request: AskRequest) => Promise<boolean>;
export type Run = {
  repo: string;
  check: string;
  step: number;
  record: (event: SessionEvent) => void;
  ask?: Ask;
};
export type Called = { toolCallId: string; toolName: string; input: unknown };
export type Answer = { part: ToolResultPart; passed?: CheckResult };

const now = () => new Date().toISOString();

function answer(call: Called, value: string): ToolResultPart {
  return {
    type: "tool-result",
    toolCallId: call.toolCallId,
    toolName: call.toolName,
    output: { type: "text", value },
  };
}

// done is the only way to finish, and it finishes only when the check passes.
async function finish(call: Called, run: Run): Promise<Answer> {
  const result = await runCheck(run.check, run.repo);
  run.record({ type: "check", at: now(), step: run.step, result });
  if (result.passed) return { part: answer(call, "The check passed."), passed: result };
  return { part: answer(call, `The check failed. Fix the cause and call done again.\n\n${result.output}`) };
}

function deny(call: Called, run: Run, input: Record<string, unknown>, by: string, reason: string): Answer {
  run.record({ type: "blocked", at: now(), step: run.step, tool: call.toolName, input, by, reason });
  return { part: { ...answer(call, ""), output: { type: "execution-denied", reason } } };
}

async function personSaysNo(call: Called, run: Run, input: Record<string, unknown>): Promise<boolean> {
  const permission = permissionFor(call.toolName, input);
  if (!permission || !run.ask) return false;
  return !(await run.ask({ ...permission, tool: call.toolName, input }));
}

export async function handleCall(call: Called, run: Run): Promise<Answer> {
  const input = (call.input ?? {}) as Record<string, unknown>;
  const refused = refusal({ tool: call.toolName, input });
  if (refused) return deny(call, run, input, refused.by, refused.reason);
  if (await personSaysNo(call, run, input)) return deny(call, run, input, "You", SAID_NO);
  if (call.toolName === "done") return finish(call, run);
  const result = await runTool(call.toolName, input, run.repo);
  run.record({ type: "tool", at: now(), step: run.step, tool: call.toolName, input, ...result });
  return { part: answer(call, result.output) };
}
