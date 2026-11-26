import { EventType } from "@ag-ui/core";
import type { Emit } from "../../../agent/agent";
import { basketChanged } from "../../../agent/agent";
import { answerProposal, basketSummary, waitingProposal } from "../../../db/queries";
import type { Turn } from "./input";

// The shopper pressed Add all or No thanks on a basket card. The items come from the proposal saved
// on the server when the agent made it, never from the page, so a page cannot add what was not proposed.

export async function answerBasket(turn: Extract<Turn, { kind: "answer" }>, owner: string, emit: Emit) {
  const proposal = await waitingProposal(owner, turn.toolCallId);
  const messageId = crypto.randomUUID();
  const say = (text: string) => {
    emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });
    emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: text });
    emit({ type: EventType.TEXT_MESSAGE_END, messageId });
  };
  if (!proposal) return say("That basket was already answered.");
  await answerProposal(proposal.id, owner, turn.yes);
  basketChanged(emit, await basketSummary(owner));
  say(turn.yes ? "Added to your basket." : "Nothing was added.");
}
