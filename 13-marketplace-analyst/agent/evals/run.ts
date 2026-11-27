import { describeTable, listTables } from "../../db/catalog";
import { type NewResult, saveRun } from "../../db/eval-queries";
import { missed } from "../../rules/bars";
import { summarize } from "../../rules/eval-score";
import { CASES, type Case } from "./cases";
import { runCase } from "./run-case";

// Runs the gold set, a few cases at a time, and saves the run for the Evals page.

const AT_ONCE = 4;

// The schema's names and descriptions. The model may read these, so the leak check skips what they say.
async function schemaDocs(): Promise<string> {
  const all = await listTables();
  const columns = await Promise.all(all.tables.map((table) => describeTable(table.name)));
  return JSON.stringify([all, columns]);
}

export async function runEvals(cases: Case[] = CASES) {
  const known = await schemaDocs();
  const results: NewResult[] = [];
  let costUsd = 0;
  for (let start = 0; start < cases.length; start += AT_ONCE) {
    const batch = cases.slice(start, start + AT_ONCE).map((item) => runCase(item, known));
    for (const { result, judgeCost } of await Promise.all(batch)) {
      results.push(result);
      costUsd += judgeCost + (result.scores.costUsd ?? 0);
      console.log(
        `  ${result.passed ? "pass" : "FAIL"} ${result.caseId} ${result.detail.problems.join("; ")}`,
      );
    }
  }
  const summary = summarize(results.map((result) => result.scores));
  const failures = missed(summary);
  await saveRun({ summary, passed: !failures.length, costUsd }, results);
  return { summary, failures, results, costUsd };
}
