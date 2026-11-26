import { checkWords } from "./check";
import { blockedLabel, OUTCOME_LABEL, toolLabel } from "./labels";
import type { Check, Outcome, SessionEvent } from "./session";

const OUTCOME_TONE: Record<Outcome, "pass" | "fail" | "wait"> = {
  passed: "pass",
  no_change: "wait",
  check_failed: "fail",
  stopped: "fail",
  out_of_steps: "wait",
};

// The session file as the replay shows it: one item per thing a reviewer reads, in order.
// Cost lines are folded into their step, so every item is something the agent did or was told.

export type Tone = "pass" | "fail" | "wait" | "info" | "plain";
export type ReplayItem = {
  step: number;
  at: string;
  title: string;
  detail: string;
  tone: Tone;
  // The words on the fold that opens a long detail.
  fold?: string;
  spent: number;
  // Its place in the session, so each row keeps its identity as the replay moves.
  position: number;
};

const LONGEST = 6000;

export const clip = (text: string) =>
  text.length > LONGEST
    ? `${text.slice(0, LONGEST)}\n\nCut to the first ${LONGEST} characters. The session file has the rest.`
    : text;

const checkLine = (result: Check) =>
  result.failures.length
    ? `${checkWords(result)}. Failing: ${result.failures.slice(0, 5).join(", ")}`
    : checkWords(result);

// What a reviewer needs from a tool call: for an edit, the text it took out and what it put in.
// A failed call shows the error the agent was given.
function toolDetail(tool: string, input: Record<string, unknown>, ok: boolean, output: string): string {
  if (!ok) return clip(output);
  if (tool === "edit")
    return clip(`Took out:\n${String(input.old_text ?? "")}\n\nPut in:\n${String(input.new_text ?? "")}`);
  if (tool === "write") return clip(`New content:\n${String(input.content ?? "")}`);
  return clip(output);
}

const ruleName = (by: string) => by.replaceAll("-", " ");

type ToolEvent = Extract<SessionEvent, { type: "tool" }>;

function toolItem(event: ToolEvent): Shown {
  const changed = event.ok && (event.tool === "edit" || event.tool === "write");
  return {
    title: toolLabel(event.tool, event.input),
    detail: toolDetail(event.tool, event.input, event.ok, event.output),
    fold: changed ? "Show the change" : "Show what came back",
    tone: event.ok ? "plain" : "fail",
  };
}

type Shown = Pick<ReplayItem, "title" | "detail" | "tone" | "fold">;

// What one event looks like in the replay. Usage lines and empty thoughts show nothing.
function shown(event: SessionEvent): Shown | null {
  switch (event.type) {
    case "start":
      return { title: "Got the task", detail: event.task, tone: "info" };
    case "check_before":
      return { title: "Ran the check before any change", detail: checkLine(event.result), tone: "plain" };
    case "thought":
      return event.text.trim() ? { title: "Thought", detail: event.text, tone: "plain" } : null;
    case "tool":
      return toolItem(event);
    case "blocked":
      return {
        title: blockedLabel(event.tool, event.input),
        detail: `The ${ruleName(event.by)} rule said: ${event.reason}`,
        tone: "wait",
      };
    case "check":
      return {
        title: "Ran the check",
        detail: checkLine(event.result),
        tone: event.result.passed ? "pass" : "fail",
      };
    case "end":
      return { title: OUTCOME_LABEL[event.outcome], detail: event.reason, tone: OUTCOME_TONE[event.outcome] };
    default:
      return null;
  }
}

export function replayItems(events: SessionEvent[]): ReplayItem[] {
  const items: ReplayItem[] = [];
  let spent = 0;
  for (const event of events) {
    if (event.type === "usage") spent += event.cost;
    const look = shown(event);
    const step = "step" in event ? event.step : 0;
    if (look) items.push({ ...look, step, at: event.at, spent, position: items.length });
  }
  return items;
}
