import { MAX_QUESTION_CHARS } from "./limits";
import { type StoredMessage, textOf } from "./message";

const ID = /^[\w-]{1,64}$/;

// Only the words of a new question are taken from the browser. History comes from Postgres, and any
// evidence part a browser might send is dropped.
export function questionFrom(body: unknown): { conversationId: string; message: StoredMessage } | string {
  const { conversationId, message } = (body ?? {}) as { conversationId?: string; message?: StoredMessage };
  if (!ID.test(conversationId ?? "") || !ID.test(message?.id ?? "") || !Array.isArray(message?.parts))
    return "That request is not a question.";
  const text = textOf(message).trim();
  if (!text) return "Type a question first.";
  if (text.length > MAX_QUESTION_CHARS) return `Keep a question under ${MAX_QUESTION_CHARS} characters.`;
  return {
    conversationId: conversationId as string,
    message: { id: message.id, role: "user", parts: [{ type: "text", text }] },
  };
}
