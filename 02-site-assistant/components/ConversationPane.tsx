import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { assignToMe, closeConversation } from "../app/inbox/actions";
import {
  type ConversationRecord as Conversation,
  type StoredMessage,
  statusOf,
  type View,
} from "../rules/conversation";
import { ReplyBox } from "./ReplyBox";
import { Transcript } from "./Transcript";

type Props = { conversation: Conversation; messages: StoredMessage[]; view: View };

// The open conversation: who has it, what was said, and the reply box.
export function ConversationPane({ conversation, messages, view }: Props) {
  const visitor = conversation.name ?? conversation.email ?? "Guest";
  return (
    <section className="conversation-pane" aria-label={`Conversation with ${visitor}`}>
      <header className="conversation-head">
        <Link href={`/inbox?view=${view}`} className="icon-button back-to-list" aria-label="Back to the list">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div>
          <h2>{visitor}</h2>
          <p>{statusOf(conversation)}</p>
        </div>
        <div className="page-actions">
          {conversation.assigneeId ? null : (
            <form action={assignToMe}>
              <input type="hidden" name="conversation" value={conversation.id} />
              <button type="submit" className="button">
                Assign to me
              </button>
            </form>
          )}
          {conversation.closedAt ? null : (
            <form action={closeConversation}>
              <input type="hidden" name="conversation" value={conversation.id} />
              <button type="submit" className="button button-quiet">
                Close
              </button>
            </form>
          )}
        </div>
      </header>
      <Transcript messages={messages} visitor={visitor} summary={conversation.summary} />
      <ReplyBox key={conversation.id} conversationId={conversation.id} visitor={visitor} />
    </section>
  );
}
