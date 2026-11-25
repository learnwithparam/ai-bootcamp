import type { UIMessage } from "ai";
import { notFound } from "next/navigation";
import { Chat } from "../../../components/Chat";
import { Shell } from "../../../components/Shell";
import { chatFor, chatsOf, messagesOf } from "../../../db/queries";
import { removeChat } from "../../actions";
import { requireMember } from "../../session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Someone else's chat is a not-found page, the same as a chat that does not exist.
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const chat = UUID.test(id) ? await chatFor(id, member.id) : null;
  if (!chat) notFound();
  return (
    <Shell userName={member.name} chats={await chatsOf(member.id)} current={id}>
      <div className="chat-head">
        <h1>{chat.title}</h1>
        <form action={removeChat}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="button">
            Delete chat
          </button>
        </form>
      </div>
      <Chat key={id} savedId={id} initial={(await messagesOf(id)) as UIMessage[]} />
    </Shell>
  );
}
