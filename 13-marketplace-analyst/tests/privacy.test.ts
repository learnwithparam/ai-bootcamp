import { expect, test } from "bun:test";
import { analysisPrompt } from "../agent/nodes/analysis";
import { decideGraphPrompt } from "../agent/nodes/decide-graph";
import { errorAgentPrompt } from "../agent/nodes/error-agent";
import { guardrailsPrompt } from "../agent/nodes/guardrails";
import { sqlAgentPrompt } from "../agent/nodes/sql-agent";
import { vizPrompt } from "../agent/nodes/viz";
import type { State } from "../agent/state";
import { leaksIn } from "../rules/leaks";
import { recentTurns } from "../rules/message";
import type { Query } from "../rules/result";
import { safeError } from "../rules/safe-error";

// No row may reach a model. Every node's prompt is built here from results holding marker values, with
// no model, and no marker may appear in any of them.

const MARKERS = ["canary-city-qzx", "canary-seller-qzx", "918273645", "918,273,645"];
const sql = "SELECT city, orders FROM sellers";

const good: Query = {
  id: "q1",
  sql,
  columns: [
    { name: "city", type: "text" },
    { name: "orders", type: "number" },
  ],
  rows: [
    ["canary-city-qzx", 918273645],
    ["canary-seller-qzx", 2],
  ],
  repairs: 0,
};
const error = safeError('invalid input syntax for type integer: "canary-city-qzx"', sql);
const bad: Query = { id: "q2", sql, columns: [], rows: [], repairs: 0, error };

// The chat as it is saved: the words on screen hold values, the template beside them does not.
const history = recentTurns([
  { id: "1", role: "user", parts: [{ type: "text", text: "Which city?" }] },
  {
    id: "2",
    role: "assistant",
    parts: [
      { type: "text", text: "canary-city-qzx, with 918,273,645 orders." },
      { type: "data-query", data: good },
      { type: "data-template", data: { template: "{{q1.1.city}}, with {{q1.1.orders}} orders." } },
    ],
  },
]);

const state = { question: "And the rest?", history, queries: [good, bad], graphKind: "bar" } as State;

const PROMPTS = {
  guardrails: guardrailsPrompt,
  sqlAgent: sqlAgentPrompt,
  errorAgent: errorAgentPrompt,
  analysis: analysisPrompt,
  decideGraph: decideGraphPrompt,
  viz: vizPrompt,
};

test.each(Object.entries(PROMPTS))("the %s prompt holds no value from a row", (_, build) => {
  const prompt = build(state).toLowerCase();
  for (const marker of MARKERS) expect(prompt).not.toContain(marker);
});

test("the leak check sees a value if one is sent, unless the SQL already held it", () => {
  expect(leaksIn(["rows: canary-city-qzx 918273645"], [good], [])).toEqual(["canary-city-qzx", "918273645"]);
  expect(leaksIn(["canary-city-qzx"], [good], ["WHERE city = 'canary-city-qzx'"])).toEqual([]);
});
