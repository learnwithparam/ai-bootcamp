import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { replyInConversation } from "../../../agent/converse";
import {
  appendMessages,
  type Conversation,
  conversationFor,
  messagesOf,
  startConversation,
} from "../../../db/conversations";
import { usageFor } from "../../../db/queries";
import { type StoredMessage, withIncoming } from "../../../rules/conversation";
import { checkLimits, readLimits } from "../../../rules/limits";
import { cookieHeaders, type Writer, writerOf } from "../visitor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
type Body = { conversationId: string; message: StoredMessage; page?: string };

const pageOf = (page: unknown) => (typeof page === "string" && /^\/[\w/-]{0,120}$/.test(page) ? page : "/");

// Once a person has the conversation, the visitor's message is saved for them and the model is never called.
// The reply stream is empty; the messenger shows the teammate's answer when it arrives.
async function forTheTeam(conversation: Conversation, message: StoredMessage, writer: Writer) {
  await appendMessages(conversation.id, [message], true);
  const stream = createUIMessageStream({ execute: () => {} });
  return createUIMessageStreamResponse({ stream, headers: cookieHeaders(writer) });
}

async function forTheAssistant(request: Request, writer: Writer, body: Body, history: StoredMessage[]) {
  const messages = withIncoming(history, body.message) as StoredMessage[];
  const visitor = {
    id: writer.limitId,
    userId: writer.userId,
    email: writer.email,
    conversationId: body.conversationId,
  };
  const returnUrl = new URL("/", request.url).toString();
  const stream = await replyInConversation({ messages, saved: history.length, visitor, returnUrl });
  return createUIMessageStreamResponse({ stream, headers: cookieHeaders(writer) });
}

// The browser sends the conversation id and its newest message. The history comes from Postgres.
export async function POST(request: Request) {
  const writer = await writerOf(request);
  try {
    const body = (await request.json()) as Body;
    if (!UUID.test(body.conversationId ?? "")) return new Response("Not found", { status: 404 });
    const existing = await conversationFor(body.conversationId, writer.owner);
    const history = existing ? await messagesOf(existing.id) : [];
    const merged = withIncoming(history, body.message);
    if (typeof merged === "string") return new Response(merged, { status: 400 });
    if (existing?.owner === "team") return forTheTeam(existing, merged.at(-1) as StoredMessage, writer);
    const gate = checkLimits(await usageFor(writer.limitId), readLimits(process.env));
    if (!gate.open) return new Response(gate.message, { status: gate.status });
    const start = { id: body.conversationId, visitor: writer.owner, startedOn: pageOf(body.page) };
    if (
      !existing &&
      !(await startConversation({ ...start, userId: writer.userId, name: writer.name, email: writer.email }))
    )
      return new Response("Not found", { status: 404 });
    return forTheAssistant(request, writer, body, history);
  } catch (error) {
    console.error("site-assistant chat failed", error);
    return new Response("The assistant could not answer just now. Try again in a minute.", { status: 500 });
  }
}
