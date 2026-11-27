import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { MAX_REPAIRS } from "../../rules/limits";
import type { Query } from "../../rules/result";
import instructions from "../prompts/error-agent.md" with { type: "text" };
import { report, type State } from "../state";
import { writeQueries } from "../tools/write-queries";

// A query failed: rewrite it from Postgres's own message, with the same schema tools. The graph allows
// this MAX_REPAIRS times.

export function errorAgentPrompt({ question, queries, errors }: State): string {
  const failed = queries
    .filter((query) => query.error)
    .map((query) => `Query:\n${query.sql}\nError: ${query.error}`);
  const seen = errors?.length ? `\n\nErrors already seen:\n${errors.join("\n")}` : "";
  return `Question: ${question}\n\n${failed.join("\n\n")}${seen}`;
}

function rewritten(queries: Query[], fixes: string[], reasoning: string): Query[] {
  let next = 0;
  return queries.map((query) => {
    const sql = query.error ? fixes[next++] : undefined;
    if (!sql) return query;
    return { id: query.id, sql, reasoning, columns: [], rows: [], repairs: query.repairs + 1 };
  });
}

export async function errorAgent(state: State, config?: LangGraphRunnableConfig) {
  const iteration = state.iteration + 1;
  const detail = `Repair ${iteration} of ${MAX_REPAIRS}`;
  const errors = state.queries.flatMap((query) => (query.error ? [query.error] : []));
  const notes = [...state.errors, ...errors];
  report(config, { name: "errorAgent", status: "running", detail, notes });
  const written = await writeQueries(instructions, errorAgentPrompt(state), "error-agent");
  report(config, { name: "errorAgent", status: "done", detail, notes });
  return {
    queries: rewritten(state.queries, written.queries, written.reasoning),
    iteration,
    errors,
    toolCalls: written.toolCalls,
    cost: written.cost,
  };
}
