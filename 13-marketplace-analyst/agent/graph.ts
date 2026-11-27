import { END, START, StateGraph } from "@langchain/langgraph";
import { MAX_REPAIRS, overBudget } from "../rules/limits";
import { analysis } from "./nodes/analysis";
import { decideGraph } from "./nodes/decide-graph";
import { errorAgent } from "./nodes/error-agent";
import { executeSql } from "./nodes/execute-sql";
import { guardrails } from "./nodes/guardrails";
import { sqlAgent } from "./nodes/sql-agent";
import { viz } from "./nodes/viz";
import { AnalystState, type State } from "./state";

// Start here.
//
//   START -> guardrails -> sqlAgent -> executeSql -> analysis -> decideGraph -> viz -> END
//                 \-> END               ^   |                         \-> END
//                                       |   v
//                                    errorAgent   (a failed query, at most MAX_REPAIRS times)

export function afterGuardrails(state: Pick<State, "intent">) {
  return state.intent === "in_scope" ? "sqlAgent" : END;
}

export function afterExecute({ queries, iteration, cost }: Pick<State, "queries" | "iteration" | "cost">) {
  const failed = queries.some((query) => query.error);
  return failed && iteration < MAX_REPAIRS && !overBudget(cost) ? "errorAgent" : "analysis";
}

export function afterDecision(state: Pick<State, "needsGraph">) {
  return state.needsGraph ? "viz" : END;
}

export const analystGraph = new StateGraph(AnalystState)
  .addNode("guardrails", guardrails)
  .addNode("sqlAgent", sqlAgent)
  .addNode("executeSql", executeSql)
  .addNode("errorAgent", errorAgent)
  .addNode("analysis", analysis)
  .addNode("decideGraph", decideGraph)
  .addNode("viz", viz)
  .addEdge(START, "guardrails")
  .addConditionalEdges("guardrails", afterGuardrails, ["sqlAgent", END])
  .addEdge("sqlAgent", "executeSql")
  .addConditionalEdges("executeSql", afterExecute, ["errorAgent", "analysis"])
  .addEdge("errorAgent", "executeSql")
  .addEdge("analysis", "decideGraph")
  .addConditionalEdges("decideGraph", afterDecision, ["viz", END])
  .addEdge("viz", END)
  .compile();
