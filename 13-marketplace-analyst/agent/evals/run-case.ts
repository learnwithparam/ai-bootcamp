import type { NewResult } from "../../db/eval-queries";
import { describedIn, problemsOf, tablesIn } from "../../rules/eval-score";
import type { CaseDetail, CaseScores } from "../../rules/eval-types";
import { standIns, ungroundedNumbers } from "../../rules/fill-answer";
import { leaksIn } from "../../rules/leaks";
import { contextPrecision, contextRecall } from "../../rules/ragas";
import { describeShapes, succeeded } from "../../rules/result";
import { type Answered, askAnalyst } from "../agent";
import { recording } from "../model";
import { scoreRelevancy } from "./answer-relevancy";
import type { Case } from "./cases";
import { scoreFaithfulness } from "./faithfulness";
import { scoreSql } from "./sql-accuracy";

// One case: ask the real graph, then score what came back. A stopped question is scored on its route.

// The metrics counted by code. `known` is text the model was always allowed to read.
async function counted(item: Case, done: Answered, prompts: string[], known: string) {
  const asked = [item.question, item.history ?? "", known, ...done.queries.map((query) => query.sql)];
  const scores: CaseScores = {
    routing: done.intent === item.route ? 1 : 0,
    privacyLeaks: leaksIn(prompts, done.queries, asked).length,
    costUsd: done.costUsd,
  };
  const tables = { described: describedIn(done.toolCalls), needed: item.sql ? tablesIn(item.sql) : [] };
  if (!item.sql) return { scores, tables };
  const before = `${item.question} ${item.history ?? ""}`;
  const typed = ungroundedNumbers(done.answerTemplate, before, done.queries);
  scores.sqlAccuracy = await scoreSql(item.sql, done.queries);
  scores.groundedNumbers = typed.length || done.removed.length ? 0 : 1;
  scores.contextPrecision = contextPrecision(tables.described, tables.needed);
  scores.contextRecall = contextRecall(tables.described, tables.needed);
  scores.toolCalls = done.toolCalls.length;
  if (item.chart) scores.chartValidity = done.chart && item.chart.includes(done.chart.kind) ? 1 : 0;
  return { scores, tables };
}

// The two metrics a judge gives. A follow-up is judged as the full question it stands for.
async function judged(item: Case, done: Answered, evidence: string) {
  const question = item.standalone ?? item.question;
  const answer = standIns(done.answerTemplate, done.queries);
  const [faithful, relevant] = await Promise.all([
    scoreFaithfulness(question, answer, evidence),
    scoreRelevancy(question, answer),
  ]);
  return { faithful, relevant, cost: faithful.cost + relevant.cost };
}

export async function runCase(item: Case, known: string) {
  const { value: done, prompts } = await recording(() => askAnalyst(item.question, item.history));
  const { scores, tables } = await counted(item, done, prompts, known);
  const evidence = describeShapes(succeeded(done.queries));
  const judge = item.sql ? await judged(item, done, evidence) : undefined;
  if (judge) {
    scores.faithfulness = judge.faithful.score;
    scores.answerRelevancy = judge.relevant.score;
  }
  const detail: CaseDetail = {
    answer: done.answer,
    template: done.answerTemplate,
    route: done.intent,
    evidence,
    claims: judge?.faithful.claims ?? [],
    written: judge?.relevant.written ?? [],
    tables,
    problems: problemsOf(scores, done.intent, item.route),
  };
  const passed = !detail.problems.length;
  const result: NewResult = { caseId: item.id, question: item.question, passed, scores, detail };
  return { result, judgeCost: judge?.cost ?? 0 };
}
