import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { Query } from "../../rules/result";
import instructions from "../prompts/sql-agent.md" with { type: "text" };
import { report, type State } from "../state";
import { writeQueries } from "../tools/write-queries";

// The SQL agent finds the schema with tools, then writes the queries. No schema is pasted into it.

export const sqlAgentPrompt = ({ history, question }: State) =>
  `Earlier turns:\n${history}\n\nQuestion: ${question}`;

export const sqlAgentInstructions = instructions;

const toQuery = (sql: string, i: number, reasoning: string): Query => ({
  id: `q${i + 1}`,
  sql,
  reasoning,
  columns: [],
  rows: [],
  repairs: 0,
});

export async function sqlAgent(state: State, config?: LangGraphRunnableConfig) {
  report(config, { name: "sqlAgent", status: "running", detail: "Reading the schema" });
  const written = await writeQueries(instructions, sqlAgentPrompt(state), "sql-agent");
  const count = written.queries.length;
  report(config, {
    name: "sqlAgent",
    status: count ? "done" : "failed",
    detail: count ? `Wrote ${count === 1 ? "one query" : `${count} queries`}` : "No query written",
    notes: written.toolCalls,
  });
  return {
    queries: written.queries.map((sql, i) => toQuery(sql, i, written.reasoning)),
    toolCalls: written.toolCalls,
    cost: written.cost,
  };
}
