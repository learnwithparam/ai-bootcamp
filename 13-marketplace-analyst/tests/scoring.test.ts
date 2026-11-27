import { describe, expect, test } from "bun:test";
import { CASES } from "../agent/evals/cases";
import { afterDecision, afterExecute, afterGuardrails } from "../agent/graph";
import { fault } from "../agent/nodes/analysis";
import claimsPrompt from "../agent/prompts/eval-claims.md" with { type: "text" };
import type { State } from "../agent/state";
import { missed } from "../rules/bars";
import { describedIn, problemsOf, summarize, tablesIn } from "../rules/eval-score";
import type { RunSummary } from "../rules/eval-types";
import { MAX_COST_USD, MAX_REPAIRS } from "../rules/limits";
import { answerRelevancy, contextPrecision, contextRecall, cosine, faithfulness } from "../rules/ragas";
import { sameResult } from "../rules/same-result";
import { guardSql } from "../rules/sql-guard";

// The metric arithmetic, the routing of the graph and the scoring of a run. No model.

describe("the metrics, worked by hand", () => {
  test("faithfulness is the share of supported claims", () => {
    expect(faithfulness([true, true, false, true])).toBe(0.75);
    expect(faithfulness([])).toBeUndefined();
  });

  test("context precision and recall compare tables read with tables needed", () => {
    const needed = tablesIn("SELECT 1 FROM orders o JOIN marketplace.customers c USING (customer_id)");
    expect(needed).toEqual(["orders", "customers"]);
    expect(tablesIn("SELECT extract(year FROM o.purchased_at) FROM orders o")).toEqual(["orders"]);
    const read = describedIn(["listTables", "describeTable orders", "describeTable sellers"]);
    expect(contextPrecision(read, needed)).toBe(0.5);
    expect(contextRecall(read, needed)).toBe(0.5);
    expect(contextPrecision([], needed)).toBe(0);
  });

  test("answer relevancy is the mean similarity, and zero when evasive", () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(answerRelevancy([0.8, 1], false)).toBe(0.9);
    expect(answerRelevancy([0.8, 1], true)).toBe(0);
  });
});

test("two results match on values, not on names or order", () => {
  const gold = [
    ["SP", 3],
    ["RJ", 2],
  ];
  const renamed = [
    [2, "RJ", "x"],
    [3, "SP", "y"],
  ];
  expect(sameResult(gold, renamed)).toBe(true);
  // The same values paired the wrong way round is a wrong answer.
  const swapped = [
    ["SP", 2],
    ["RJ", 3],
  ];
  expect(sameResult(gold, swapped)).toBe(false);
  expect(sameResult(gold, [["SP", 3]])).toBe(false);
});

describe("scoring a run", () => {
  test("one leaked value fails the run, however many cases are clean", () => {
    const summary = summarize([{ privacyLeaks: 0 }, { privacyLeaks: 1 }, { privacyLeaks: 0 }]);
    expect(summary.privacyLeaks).toBe(1);
    expect(missed(summary).join()).toContain("Values sent to the model");
  });

  test("a run under any bar says which", () => {
    const good = { routing: 1, sqlAccuracy: 0.9, faithfulness: 0.95, answerRelevancy: 0.85 };
    const more = { contextPrecision: 0.8, contextRecall: 1, groundedNumbers: 1, chartValidity: 1 };
    const summary = { ...good, ...more, privacyLeaks: 0, toolCalls: 3, costUsd: 0.001 } as RunSummary;
    expect(missed(summary)).toEqual([]);
    expect(missed({ ...summary, faithfulness: 0.89, costUsd: 0.02 })).toHaveLength(2);
  });

  test("a case says why it failed", () => {
    expect(problemsOf({ routing: 1, sqlAccuracy: 1 }, "in_scope", "in_scope")).toEqual([]);
    const bad = { sqlAccuracy: 0, privacyLeaks: 2, chartValidity: 0 };
    expect(problemsOf(bad, "greeting", "in_scope")).toHaveLength(4);
  });

  test("every reference query runs through the guard", async () => {
    for (const item of CASES) {
      if (item.sql) expect((await guardSql(item.sql)).ok).toBe(true);
    }
    expect(new Set(CASES.map((item) => item.id)).size).toBe(CASES.length);
  });
});

describe("where the graph goes next", () => {
  const failed = { id: "q1", sql: "", columns: [], rows: [], repairs: 0, error: "no" };
  const after = (more: Partial<State>) =>
    afterExecute({ queries: [failed], iteration: 0, cost: 0, ...more } as State);

  test("only a question about the marketplace reaches the SQL agent", () => {
    expect(afterGuardrails({ intent: "in_scope" } as State)).toBe("sqlAgent");
    expect(afterGuardrails({ intent: "unsafe" } as State)).toBe("__end__");
  });

  test("a failed query is repaired, but only so often and inside the budget", () => {
    expect(after({})).toBe("errorAgent");
    expect(after({ iteration: MAX_REPAIRS })).toBe("analysis");
    expect(after({ cost: MAX_COST_USD })).toBe("analysis");
    expect(after({ queries: [] })).toBe("analysis");
  });

  test("the chart agent runs only when a chart is wanted", () => {
    expect(afterDecision({ needsGraph: true } as State)).toBe("viz");
    expect(afterDecision({ needsGraph: false } as State)).toBe("__end__");
  });
});

test("the writer is asked again for a faulty answer, and not for a good one", () => {
  const columns = [{ name: "orders", type: "number" as const }];
  const queries = [{ id: "q1", sql: "SELECT 1", columns, rows: [[7]], repairs: 0 }];
  const state = { question: "How many orders?", history: "(none)", queries } as State;
  expect(fault("There are {{q1.1.orders}} orders.", state)).toBe("");
  expect(fault("There are many orders.", state)).toContain("required slots");
  expect(fault("{{q1.1.orders}}", state)).toContain("no sentence");
  const many = { ...state, queries: [{ ...queries[0], rows: [[7], [8]] }] } as State;
  expect(fault("These are the orders. {{q1.list}}", many)).toBe("");
  const named = {
    ...many,
    queries: [{ ...many.queries[0], columns: [{ name: "order_count", type: "number" }] }],
  } as State;
  expect(fault("These are by order_count. {{q1.list}}", named)).toContain("column name");
  expect(fault("These are the orders. {{q1.list}} The orders are .", many)).toContain("unfinished");
  expect(fault("How many? These. {{q1.list}}", many)).toContain("question back");
  expect(fault("{{q1.list}} are the orders.", many)).toContain("after a list");
  expect(fault("Here, {{q1.list}}, are the orders.", many)).toContain("after a list");
  expect(fault("{{q1.1.orders}} orders, up 154.", state)).toContain("figure");
  expect(fault("{{q1.1.orders}} of {{q2.1.total}} orders.", state)).toContain("does not exist");
});

test("claims are listed from the answer alone, so the context cannot become a claim", () => {
  expect(claimsPrompt.match(/\{\{\w+\}\}/g)).toEqual(["{{question}}", "{{answer}}"]);
});
