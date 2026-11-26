import { interrupt } from "@langchain/langgraph";
import { type Pause, whyNotSend } from "../../rules/intake";
import type { State } from "../graph";

// Step five: the second pause. The lawyer reads the draft, edits it, and approves the words that go to the client.
// The letter the client sees is the lawyer's text, never the model's draft on its own.
export function approveLetter({ draft, conflicts }: Pick<State, "draft" | "conflicts">) {
  let question: Pause = { kind: "approve", draft };
  for (;;) {
    const letter = interrupt<Pause, string>(question);
    const refused = whyNotSend(letter, conflicts);
    if (!refused) return { letter: letter.trim() };
    question = { kind: "approve", draft, refused };
  }
}
