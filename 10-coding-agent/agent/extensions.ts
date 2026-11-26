import { noNewPackages } from "../extensions/no-new-packages";
import { protectTests } from "../extensions/protect-tests";
import { spendCap } from "../extensions/spend-cap";

// Extensions change what the harness allows without touching the loop, the way Pi's do.
// beforeTool can refuse one tool call. afterStep can end the run.
// Each one returns a reason in plain words, or null to say nothing. The reason is what the model reads,
// and what the review page shows next to the refused call.

export type ToolCall = { tool: string; input: Record<string, unknown> };
export type RunSoFar = { step: number; cost: number };

export type Extension = {
  name: string;
  beforeTool?: (call: ToolCall) => string | null;
  afterStep?: (run: RunSoFar) => string | null;
};

// To add one, write a file in extensions/ and put it in this list.
export const EXTENSIONS: Extension[] = [protectTests, noNewPackages, spendCap];

export function refusal(call: ToolCall): { by: string; reason: string } | null {
  for (const extension of EXTENSIONS) {
    const reason = extension.beforeTool?.(call);
    if (reason) return { by: extension.name, reason };
  }
  return null;
}

export function reasonToStop(run: RunSoFar): string | null {
  for (const extension of EXTENSIONS) {
    const reason = extension.afterStep?.(run);
    if (reason) return reason;
  }
  return null;
}
