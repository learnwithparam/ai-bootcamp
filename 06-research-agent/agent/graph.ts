import { Annotation, END, Send, START, StateGraph } from "@langchain/langgraph";
import type { CheckedClaim, Claim } from "../rules/claims";
import type { Identity } from "../rules/report";
import type { Facts, Score } from "../rules/score";
import { TOPICS } from "../rules/topics";
import { check } from "./nodes/check";
import { identify } from "./nodes/identify";
import { research } from "./nodes/research";
import { scoreLead } from "./nodes/score";

// Start here. The graph: identify the company, research every topic at the same time, check each quote, then score.
//
//   START -> identify -> research (one per topic, in parallel) -> check -> scoreLead -> END
//                    \-> END when no company matches

export const ResearchState = Annotation.Root({
  company: Annotation<string>,
  today: Annotation<string>,
  identity: Annotation<Identity | null>,
  // Each researcher adds its claims. The reducer joins them, so parallel steps never overwrite each other.
  claims: Annotation<Claim[]>({ reducer: (all, more) => all.concat(more), default: () => [] }),
  checked: Annotation<CheckedClaim[]>,
  facts: Annotation<Facts | null>,
  score: Annotation<Score | null>,
  cost: Annotation<number>({ reducer: (sum, more) => sum + more, default: () => 0 }),
});

export type State = typeof ResearchState.State;

// After identify: one Send per topic starts the researchers together. No company means stop here.
export function afterIdentify(state: Pick<State, "identity">) {
  const identity = state.identity;
  if (!identity) return END;
  return TOPICS.map((topic) => new Send("research", { topic, identity }));
}

export const researchGraph = new StateGraph(ResearchState)
  .addNode("identify", identify)
  .addNode("research", research)
  .addNode("check", check)
  .addNode("scoreLead", scoreLead)
  .addEdge(START, "identify")
  .addConditionalEdges("identify", afterIdentify, ["research", END])
  .addEdge("research", "check")
  .addEdge("check", "scoreLead")
  .addEdge("scoreLead", END)
  .compile();
