import type { Chart } from "./chart-spec";
import type { Query } from "./result";

// What the graph tells the screen while it works. Each becomes a typed data part of the answer.

export const STEP_NAMES = [
  "guardrails",
  "sqlAgent",
  "executeSql",
  "errorAgent",
  "analysis",
  "decideGraph",
  "viz",
] as const;

export type StepName = (typeof STEP_NAMES)[number];
export type Step = {
  name: StepName;
  status: "running" | "done" | "failed";
  detail: string;
  // The node's own trail: schema tool calls, or the errors that were repaired.
  notes?: string[];
};
export type Timeline = { steps: Step[]; costUsd: number; seconds?: number };

export type AnalystData = {
  timeline: Timeline;
  query: Query;
  chart: Chart;
  // The answer as the model wrote it, slots unfilled. Only this goes back to a model as history.
  template: { template: string };
};

// A step that reports again replaces its earlier line.
export function withStep(steps: Step[], step: Step): Step[] {
  const at = steps.findIndex((each) => each.name === step.name);
  return at < 0 ? [...steps, step] : steps.with(at, step);
}
