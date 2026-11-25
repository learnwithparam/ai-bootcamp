import { interrupt } from "@langchain/langgraph";
import { type Decision, type Pause, whyNotAccept } from "../../rules/intake";
import type { State } from "../graph";

// Step three: the graph stops here and waits for a lawyer. interrupt() saves the run and ends it.
// When the lawyer decides, the run starts this step again, and interrupt() returns their decision.
// The rule is checked again here, so a decision that skipped the page's check still cannot accept a conflict.
// A refused answer is not an error: the step asks again, with the reason. LangGraph keeps every answer
// in order, so the second interrupt() waits for the second answer.
export function lawyerReview({ assessment, conflicts }: Pick<State, "assessment" | "conflicts">) {
  let question: Pause = { kind: "review" };
  for (;;) {
    const decision: Decision = interrupt<Pause, Decision>(question);
    const refused =
      decision.choice === "accept" ? whyNotAccept(assessment, conflicts, decision.clearedPossible) : null;
    if (!refused) return { decision };
    question = { kind: "review", refused };
  }
}
