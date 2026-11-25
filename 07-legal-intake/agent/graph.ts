import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { checkpoints } from "../db/checkpoints";
import type { Assessment, Conflict, Decision, Request } from "../rules/intake";
import { approveLetter } from "./nodes/approve";
import { assess } from "./nodes/assess";
import { checkConflicts } from "./nodes/conflicts";
import { lawyerReview } from "./nodes/review";
import { writeLetter } from "./nodes/write";

// Start here. One client request moves through five steps. Two of them wait for a lawyer.
//
//   START -> assess -> checkConflicts -> lawyerReview (pause) -> writeLetter -> approveLetter (pause) -> END
//
// Each step's result is saved to Postgres by the checkpointer, keyed by the request's id.
// A pause can last a week and survive any number of restarts: the next resume picks up from the saved state.

export const IntakeState = Annotation.Root({
  request: Annotation<Request>,
  assessment: Annotation<Assessment>,
  conflicts: Annotation<Conflict[]>,
  decision: Annotation<Decision>,
  draft: Annotation<string>,
  letter: Annotation<string>,
  cost: Annotation<number>({ reducer: (sum, more) => sum + more, default: () => 0 }),
});

export type State = typeof IntakeState.State;

export const intakeGraph = new StateGraph(IntakeState)
  .addNode("assess", assess)
  .addNode("checkConflicts", checkConflicts)
  .addNode("lawyerReview", lawyerReview)
  .addNode("writeLetter", writeLetter)
  .addNode("approveLetter", approveLetter)
  .addEdge(START, "assess")
  .addEdge("assess", "checkConflicts")
  .addEdge("checkConflicts", "lawyerReview")
  .addEdge("lawyerReview", "writeLetter")
  .addEdge("writeLetter", "approveLetter")
  .addEdge("approveLetter", END)
  .compile({ checkpointer: checkpoints });
