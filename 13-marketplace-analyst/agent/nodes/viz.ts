import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";
import { chartable, chartFrom } from "../../rules/chart-spec";
import { describeShapes, type Query } from "../../rules/result";
import { askFor } from "../ask";
import { fill } from "../prompt";
import prompt from "../prompts/viz.md" with { type: "text" };
import { report, type State } from "../state";

// The model names columns and a title. It writes no code: code checks the names and draws from the rows.

// The query and the columns are offered as fixed choices, so the model cannot name one that is not there.
function specFor(queries: Query[]) {
  const results = queries.filter(chartable);
  const columns = results.flatMap((query) => query.columns.map((column) => column.name));
  const column = z.enum(columns as [string, ...string[]]);
  const query = z.enum(results.map((each) => each.id) as [string, ...string[]]);
  return z.object({ query, x: column, y: column, title: z.string() });
}

export const vizPrompt = ({ question, queries, graphKind }: State) =>
  fill(prompt, { kind: graphKind, question, shapes: describeShapes(queries.filter(chartable)) });

export async function viz(state: State, config?: LangGraphRunnableConfig) {
  report(config, { name: "viz", status: "running", detail: "Choosing the columns" });
  const { output, cost } = await askFor(specFor(state.queries), vizPrompt(state), "viz");
  const chart = chartFrom({ ...output, kind: state.graphKind }, state.queries);
  const detail = chart ? `${chart.yLabel} by ${chart.xLabel}` : "Those columns cannot be drawn";
  report(config, { name: "viz", status: chart ? "done" : "failed", detail });
  return { chart, cost };
}
