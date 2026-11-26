import type { UIMessage } from "ai";
import { Trash2 } from "lucide-react";
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
    <Shell person={{ name: member.name, role: member.role }} chats={await chatsOf(member.id)} current={id}>
      <div className="chat-head">
        <h1>{chat.title}</h1>
        <form action={removeChat}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="button button-quiet">
            <Trash2 aria-hidden="true" /> Delete chat
          </button>
        </form>
      </div>
      <Chat
        key={id}
        savedId={id}
        initial={(await messagesOf(id)) as UIMessage[]}
        firstName={member.name.split(" ")[0] ?? member.name}
      />
    </Shell>
  );
}
