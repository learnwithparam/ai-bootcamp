import { Annotation, END, Send, START, StateGraph } from "@langchain/langgraph";
import type { CheckedClaim } from "../rules/claims";
import type { Identity } from "../rules/report";
import type { Facts, Score } from "../rules/score";
import { TOPICS } from "../rules/topics";
import { identify } from "./nodes/identify";
import { research } from "./nodes/research";
import { scoreLead } from "./nodes/score";

// Start here. The graph: identify the company, research every topic at the same time, then score.
// Each researcher opens the pages it cites and keeps only claims whose quote is on them.
//
//   START -> identify -> research (one per topic, in parallel, each checks its quotes) -> scoreLead -> END
//                    \-> END when no company matches

export const ResearchState = Annotation.Root({
  company: Annotation<string>,
  today: Annotation<string>,
  identity: Annotation<Identity | null>,
  // Each researcher adds its checked claims. The reducer joins them, so parallel steps never overwrite each other.
  claims: Annotation<CheckedClaim[]>({ reducer: (all, more) => all.concat(more), default: () => [] }),
  topicsDone: Annotation<string[]>({ reducer: (all, more) => all.concat(more), default: () => [] }),
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
  .addNode("scoreLead", scoreLead)
  .addEdge(START, "identify")
  .addConditionalEdges("identify", afterIdentify, ["research", END])
  .addEdge("research", "scoreLead")
  .addEdge("scoreLead", END)
  .compile();
