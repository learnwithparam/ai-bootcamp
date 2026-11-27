import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { runSelect } from "../../db/readonly";
import type { Query } from "../../rules/result";
import { safeError } from "../../rules/safe-error";
import { report, type State } from "../state";

// No model here. Each query that has not run yet is checked and run as the read-only account.

const ran = (query: Query) => query.columns.length > 0 || query.error !== undefined;

async function run(query: Query): Promise<Query> {
  try {
    return { ...query, ...(await runSelect(query.sql)) };
  } catch (error) {
    // The full message stays in the server's log. Only the scrubbed line is shown or prompted.
    console.error("marketplace-analyst: a query failed", String(error));
    const message = error instanceof Error ? error.message : String(error);
    return { ...query, error: safeError(message, query.sql) };
  }
}

const counted = (queries: Query[]) => queries.map((query) => `${query.rows.length} rows`).join(", ");

export async function executeSql(state: State, config?: LangGraphRunnableConfig) {
  report(config, { name: "executeSql", status: "running", detail: "Running the query" });
  const queries = await Promise.all(state.queries.map((query) => (ran(query) ? query : run(query))));
  const failed = queries.filter((query) => query.error);
  const worked = queries.length > 0 && !failed.length;
  report(config, {
    name: "executeSql",
    status: worked ? "done" : "failed",
    detail: worked ? counted(queries) : (failed[0]?.error ?? "No query to run"),
  });
  return { queries };
}
