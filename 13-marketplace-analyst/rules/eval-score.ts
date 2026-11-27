import type { CaseScores, Metric, RunSummary } from "./eval-types";
import { mean } from "./ragas";
import type { Intent } from "./replies";
import { TABLES } from "./sql-guard";

// What the counted metrics read, what makes a case fail, and the run's totals. No model in here.

// The tables a query reads. Used for the reference side of context precision and recall.
export function tablesIn(sql: string): string[] {
  const named = [...sql.matchAll(/\b(?:from|join)\s+(?:marketplace\.)?(\w+)/gi)].map((m) => m[1] ?? "");
  return [...new Set(named.filter((name) => TABLES.includes(name)))];
}

// The tables the agent asked to have described, from the tool calls such as "describeTable orders".
export function describedIn(toolCalls: string[]): string[] {
  const named = toolCalls.flatMap((call) => {
    const [tool, table] = call.split(" ");
    return tool === "describeTable" && table ? [table] : [];
  });
  return [...new Set(named)];
}

// Faithfulness and the other averages are judged over the run. These are judged case by case, because
// one wrong answer there is simply wrong.
export function problemsOf(scores: CaseScores, route: Intent, expected: Intent): string[] {
  const problems: string[] = [];
  if (route !== expected) problems.push(`routed to ${route}, expected ${expected}`);
  if (scores.sqlAccuracy === 0) problems.push("the query returned different rows from the reference query");
  if (scores.privacyLeaks) problems.push("a value from a row was sent to the model");
  if (scores.groundedNumbers === 0) problems.push("the answer has a figure or a slot with no row behind it");
  if (scores.chartValidity === 0) problems.push("the expected chart was not drawn");
  if (scores.faithfulness !== undefined && scores.faithfulness < 1)
    problems.push("a claim in the answer is not supported");
  return problems;
}

// Leaks are added up, because one is too many. Everything else is an average over the cases it applies to.
export function summarize(all: CaseScores[]): RunSummary {
  const of = (metric: Metric) => mean(all.map((scores) => scores[metric]));
  const averaged: Metric[] = [
    "routing",
    "sqlAccuracy",
    "faithfulness",
    "answerRelevancy",
    "contextPrecision",
    "contextRecall",
    "groundedNumbers",
    "chartValidity",
    "toolCalls",
    "costUsd",
  ];
  const summary = Object.fromEntries(averaged.map((metric) => [metric, of(metric)]));
  const privacyLeaks = all.reduce((sum, scores) => sum + (scores.privacyLeaks ?? 0), 0);
  return { ...summary, privacyLeaks } as RunSummary;
}
