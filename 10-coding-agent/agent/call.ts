import type { ToolResultPart } from "ai";
import type { CheckResult } from "../rules/check";
import type { SessionEvent } from "../rules/session";
import { runCheck } from "./check";
import { refusal } from "./extensions";
import { runTool } from "./tools/all";

// One tool call, from the model's request to the answer it reads back.
// Order matters: the extensions may refuse first, then the tool runs, then the event is written down.

export type Run = { repo: string; check: string; step: number; record: (event: SessionEvent) => void };
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

export async function handleCall(call: Called, run: Run): Promise<Answer> {
  const input = (call.input ?? {}) as Record<string, unknown>;
  const refused = refusal({ tool: call.toolName, input });
  if (refused) {
    run.record({ type: "blocked", at: now(), step: run.step, tool: call.toolName, input, ...refused });
    const part: ToolResultPart = {
      ...answer(call, ""),
      output: { type: "execution-denied", reason: refused.reason },
    };
    return { part };
  }
  if (call.toolName === "done") return finish(call, run);
  const result = await runTool(call.toolName, input, run.repo);
  run.record({ type: "tool", at: now(), step: run.step, tool: call.toolName, input, ...result });
  return { part: answer(call, result.output) };
}
