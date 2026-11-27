import { expect, test } from "bun:test";
import { runEvals } from "../agent/evals/run";
import { errorAgent } from "../agent/nodes/error-agent";
import { executeSql } from "../agent/nodes/execute-sql";
import type { State } from "../agent/state";
import { BARS } from "../rules/bars";

// The proof, on the real model and the real data. Run it with `bun run proof marketplace-analyst`.

test("a query that fails is rewritten from the database's error", async () => {
  const sql = "SELECT state_of_order, count(*) AS orders FROM orders GROUP BY state_of_order";
  const question = "How many orders are there in each order status?";
  const queries = [{ id: "q1", sql, columns: [], rows: [], repairs: 0 }];
  let state = { question, queries, errors: [], toolCalls: [], iteration: 0, cost: 0 } as unknown as State;
  state = { ...state, ...(await executeSql(state)) };
  expect(state.queries[0]?.error).toContain("state_of_order");
  state = { ...state, ...(await errorAgent(state)) };
  state = { ...state, ...(await executeSql(state)) };
  expect(state.queries[0]?.error).toBeUndefined();
  expect(state.queries[0]?.repairs).toBe(1);
}, 60_000);

// The whole gold set. It fails when any metric misses its bar, so a leak of one value fails it too.
test("the analyst clears every bar on the gold set", async () => {
  const { summary, failures, costUsd } = await runEvals();
  for (const bar of BARS) console.log(`${bar.label}: ${summary[bar.metric].toFixed(4)} (bar ${bar.bar})`);
  console.log(`tool calls per question: ${summary.toolCalls.toFixed(2)}, run cost: US$${costUsd.toFixed(4)}`);
  expect(failures).toEqual([]);
}, 600_000);
