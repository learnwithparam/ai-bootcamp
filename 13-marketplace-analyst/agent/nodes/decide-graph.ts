import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";
import { chartable, worthCharting } from "../../rules/chart-spec";
import { overBudget } from "../../rules/limits";
import { describeShapes } from "../../rules/result";
import { askFor } from "../ask";
import { fill } from "../prompt";
import prompt from "../prompts/decide-graph.md" with { type: "text" };
import { report, type State } from "../state";

// Is a chart worth drawing, and which kind? Code answers the first, the model the second.

const Decision = z.object({ kind: z.enum(["bar", "line", "pie", "scatter"]), reason: z.string() });

export const decideGraphPrompt = ({ question, queries }: State) =>
  fill(prompt, { question, shapes: describeShapes(queries.filter(chartable)) });

export async function decideGraph(state: State, config?: LangGraphRunnableConfig) {
  const say = (detail: string) => report(config, { name: "decideGraph", status: "done", detail });
  if (!state.queries.some(worthCharting) || overBudget(state.cost)) {
    say("Nothing here to draw");
    return { needsGraph: false };
  }
  report(config, { name: "decideGraph", status: "running", detail: "Which chart fits?" });
  const { output, cost } = await askFor(Decision, decideGraphPrompt(state), "decide-graph");
  say(`A ${output.kind} chart`);
  return { needsGraph: true, graphKind: output.kind, cost };
}
