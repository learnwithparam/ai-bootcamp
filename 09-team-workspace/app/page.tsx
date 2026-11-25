import { Chat } from "../components/Chat";
import { Shell } from "../components/Shell";
import { chatsOf } from "../db/queries";
import { requireMember } from "./session";

// A new chat. The browser makes its id, and the chat is saved with its first message.
export default async function NewChatPage() {
  const member = await requireMember();
  return (
    <Shell userName={member.name} chats={await chatsOf(member.id)}>
      <Chat initial={[]} />
    </Shell>
  );
}
