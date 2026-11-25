import { randomUUID } from "node:crypto";
import { currentSession } from "@bootcamp/auth";
import { createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from "ai";
import { answer, costOf } from "../../../agent/agent";
import { chatFor, messagesOf, openChat, roleOf, type StoredMessage, saveMessages } from "../../../db/queries";
import { type Message, titleFrom, whyNotSend, withIncoming } from "../../../rules/chat";
import { errorMessage } from "./error-message";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const refuse = (text: string, status = 400) => new Response(text, { status });
const textOf = (message: Message) =>
  message.parts.map((part) => (part.type === "text" ? (part as { text?: string }).text : "")).join(" ");

function logged(error: unknown): string {
  console.error("team-workspace chat failed", error);
  return errorMessage(error);
}

// The chat this message belongs to, with the history from the database and the new message added.
// A chat is made only for a first message that passes the limits, so a refusal leaves nothing behind.
async function conversation(userId: string, chatId: string, incoming: Message) {
  if (!UUID.test(chatId)) return refuse("Not found", 404);
  const existing = await chatFor(chatId, userId);
  const history = existing ? ((await messagesOf(chatId)) as Message[]) : [];
  const refused = incoming.role === "user" ? whyNotSend(history.length, textOf(incoming)) : null;
  if (refused) return refuse(refused);
  const merged = withIncoming(history, incoming);
  if (typeof merged === "string") return refuse(merged);
  if (!existing && !(await openChat(chatId, userId, titleFrom(textOf(incoming)))))
    return refuse("Not found", 404);
  return merged;
}

// The same 404 as the pages for anyone outside the team. The reply is saved when it ends, with its cost.
export async function POST(request: Request) {
  const session = await currentSession(request.headers);
  if (!session || !(await roleOf(session.user.id))) return refuse("Not found", 404);
  try {
    const { chatId, message } = (await request.json()) as { chatId: string; message: Message };
    const messages = await conversation(session.user.id, chatId, message);
    if (messages instanceof Response) return messages;
    const reply = await answer(session.user, chatId, messages as UIMessage[]);
    const stream = toUIMessageStream({
      stream: reply.result.stream,
      originalMessages: messages as UIMessage[],
      generateMessageId: randomUUID,
      onError: logged,
      onFinish: async ({ messages: all }) => {
        try {
          await saveMessages(chatId, all as StoredMessage[], costOf(await reply.result.steps));
        } finally {
          await reply.close();
        }
      },
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("team-workspace chat failed", error);
    return refuse(errorMessage(error), 500);
  }
}
