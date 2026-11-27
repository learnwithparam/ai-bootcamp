import type { Metric, RunSummary } from "./eval-types";

// The bar each metric must clear. `bun run proof marketplace-analyst` fails below any one of them,
// and the Evals page draws each score against its bar.

export type Bar = { metric: Metric; label: string; bar: number; atMost?: boolean; asks: string };

export const BARS: Bar[] = [
  { metric: "routing", label: "Routing", bar: 1, asks: "Was the question let in, or stopped, correctly?" },
  { metric: "sqlAccuracy", label: "SQL accuracy", bar: 0.85, asks: "Does the query return the right rows?" },
  {
    metric: "faithfulness",
    label: "Faithfulness",
    bar: 0.9,
    asks: "Is every claim in the answer supported?",
  },
  { metric: "answerRelevancy", label: "Answer relevancy", bar: 0.6, asks: "Does it answer what was asked?" },
  { metric: "contextPrecision", label: "Context precision", bar: 0.7, asks: "Were the tables read needed?" },
  { metric: "contextRecall", label: "Context recall", bar: 0.9, asks: "Were the needed tables read?" },
  {
    metric: "groundedNumbers",
    label: "Grounded numbers",
    bar: 0.95,
    asks: "Does every figure come from a row?",
  },
  { metric: "chartValidity", label: "Charts", bar: 0.9, asks: "Is the expected chart drawn from the rows?" },
  {
    metric: "privacyLeaks",
    label: "Values sent to the model",
    bar: 0,
    atMost: true,
    asks: "Counted in every prompt",
  },
  { metric: "costUsd", label: "Cost per question", bar: 0.005, atMost: true, asks: "US dollars, on average" },
];

export function meets(bar: Bar, score: number): boolean {
  return bar.atMost ? score <= bar.bar : score >= bar.bar;
}

export function missed(summary: RunSummary): string[] {
  return BARS.filter((bar) => !meets(bar, summary[bar.metric])).map(
    (bar) => `${bar.label} ${summary[bar.metric].toFixed(3)} misses its bar of ${bar.bar}`,
  );
}
