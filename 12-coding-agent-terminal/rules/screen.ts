import { checkWords } from "@bootcamp/coding-harness/rules/check";
import { blockedLabel, OUTCOME_LABEL, toolLabel } from "@bootcamp/coding-harness/rules/labels";
import type { SessionEvent } from "@bootcamp/coding-harness/rules/session";
import { changeOf } from "./diff";

// The transcript is a fold over the same events the session file holds, so what you watched
// is exactly what a reviewer replays. No event is shown under its raw name.

export type Tone = "you" | "plain" | "quiet" | "pass" | "fail" | "wait";

export type Item = {
  id: number;
  tone: Tone;
  text: string;
  // An edit or write carries its change as a unified diff, drawn under the line.
  diff?: { text: string; filetype: string };
  // A tool's output, shown only when you ask for detail with Ctrl+O.
  detail?: string;
};

// check is the last check in words, and passed says whether it was green. Before any change it is the starting point.
export type Status = { steps: number; tokens: number; cost: number; check: string; passed: boolean };

export const EMPTY_STATUS: Status = { steps: 0, tokens: 0, cost: 0, check: "", passed: false };

function toolItem(event: Extract<SessionEvent, { type: "tool" }>): Omit<Item, "id"> {
  const change = event.ok ? changeOf(event.tool, event.input) : undefined;
  return {
    tone: event.ok ? "pass" : "fail",
    text: `${event.ok ? "✓" : "✗"} ${toolLabel(event.tool, event.input)}`,
    diff: change,
    detail: event.output.trim() || undefined,
  };
}

// A no from you reads as your answer to the prompt; a refusal by a rule names the rule.
function blockedText(event: Extract<SessionEvent, { type: "blocked" }>): string {
  if (event.by === "You") return `⊘ ${blockedLabel(event.tool, event.input)}: you said no`;
  return `⊘ ${blockedLabel(event.tool, event.input)} (${event.by})`;
}

function endItem(event: Extract<SessionEvent, { type: "end" }>): Omit<Item, "id"> {
  const tone = event.outcome === "passed" ? "pass" : event.outcome === "stopped" ? "wait" : "fail";
  return { tone, text: `${OUTCOME_LABEL[event.outcome]}. ${event.reason}` };
}

// One event as a line on screen, or nothing for the events only the status line uses.
export function itemFor(event: SessionEvent): Omit<Item, "id"> | null {
  switch (event.type) {
    case "start":
      return { tone: "quiet", text: `Working in ${event.repo} at ${event.commit.slice(0, 8)}` };
    case "check_before":
      return { tone: "quiet", text: `Check before any change: ${checkWords(event.result)}` };
    case "thought":
      return { tone: "plain", text: event.text };
    case "tool":
      return toolItem(event);
    case "blocked":
      return { tone: "wait", text: blockedText(event) };
    case "check":
      return {
        tone: event.result.passed ? "pass" : "fail",
        text: `${event.result.passed ? "✓ Check passed" : "✗ Check failed"}: ${checkWords(event.result)}`,
      };
    case "end":
      return endItem(event);
    default:
      return null;
  }
}

export function statusAfter(status: Status, event: SessionEvent): Status {
  if (event.type === "usage")
    return {
      ...status,
      steps: event.step,
      tokens: status.tokens + event.tokens,
      cost: status.cost + event.cost,
    };
  if (event.type === "check_before" || event.type === "check")
    return { ...status, check: checkWords(event.result), passed: event.result.passed };
  return status;
}
