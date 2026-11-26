import { z } from "zod";

// The session file: one JSON line per thing that happened in a run, in order.
// The CLI writes it as the run goes, the review page replays it, and the upload is checked against this shape.

const at = z.string().datetime();
const check = z.object({
  passed: z.boolean(),
  pass: z.number().int(),
  fail: z.number().int(),
  failures: z.array(z.string()),
  output: z.string(),
});

export const OUTCOMES = ["passed", "no_change", "check_failed", "stopped", "out_of_steps"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const EventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    at,
    task: z.string(),
    repo: z.string(),
    commit: z.string(),
    check: z.string(),
  }),
  z.object({ type: z.literal("check_before"), at, result: check }),
  z.object({ type: z.literal("thought"), at, step: z.number().int(), text: z.string() }),
  z.object({
    type: z.literal("tool"),
    at,
    step: z.number().int(),
    tool: z.string(),
    input: z.record(z.string(), z.unknown()),
    output: z.string(),
    ok: z.boolean(),
  }),
  z.object({
    type: z.literal("blocked"),
    at,
    step: z.number().int(),
    tool: z.string(),
    input: z.record(z.string(), z.unknown()),
    by: z.string(),
    reason: z.string(),
  }),
  z.object({ type: z.literal("check"), at, step: z.number().int(), result: check }),
  z.object({
    type: z.literal("usage"),
    at,
    step: z.number().int(),
    cost: z.number(),
    tokens: z.number().int(),
  }),
  z.object({ type: z.literal("end"), at, outcome: z.enum(OUTCOMES), reason: z.string(), diff: z.string() }),
]);

export type SessionEvent = z.infer<typeof EventSchema>;
export type Check = z.infer<typeof check>;

// Reads a session file. A line that does not match says which line, so a broken upload is easy to find.
export function readSession(text: string): SessionEvent[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => {
      const parsed = EventSchema.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`Line ${index + 1} of the session file is not a session event.`);
      return parsed.data;
    });
}

export type Summary = {
  task: string;
  repo: string;
  commit: string;
  checkCommand: string;
  outcome: Outcome;
  reason: string;
  diff: string;
  steps: number;
  cost: number;
  blocked: number;
  before: Check | null;
  after: Check | null;
  startedAt: Date;
  finishedAt: Date;
};

function last<Type extends SessionEvent["type"]>(events: SessionEvent[], type: Type) {
  return events.findLast((event) => event.type === type) as Extract<SessionEvent, { type: Type }> | undefined;
}

// What the runs list needs, worked out from the events, so the list and the replay can never disagree.
export function summarize(events: SessionEvent[]): Summary {
  const start = events[0];
  const end = last(events, "end");
  if (start?.type !== "start" || !end) throw new Error("A session file starts with start and ends with end.");
  const usage = events.filter((event) => event.type === "usage");
  return {
    task: start.task,
    repo: start.repo,
    commit: start.commit,
    checkCommand: start.check,
    outcome: end.outcome,
    reason: end.reason,
    diff: end.diff,
    steps: Math.max(0, ...usage.map((event) => event.step)),
    cost: usage.reduce((sum, event) => sum + event.cost, 0),
    blocked: events.filter((event) => event.type === "blocked").length,
    before: last(events, "check_before")?.result ?? null,
    after: last(events, "check")?.result ?? null,
    startedAt: new Date(start.at),
    finishedAt: new Date(end.at),
  };
}

// A passing check proves nothing when no file changed: the tests passed before the agent started too.
// So an agent that says done with an empty diff ends as "no_change", and its last message says why.
export function settle(outcome: Outcome, reason: string, diff: string): { outcome: Outcome; reason: string } {
  if (outcome !== "passed" || diff.trim() !== "") return { outcome, reason };
  return {
    outcome: "no_change",
    reason: "The agent said it was done without changing any file. Its last message says why.",
  };
}
