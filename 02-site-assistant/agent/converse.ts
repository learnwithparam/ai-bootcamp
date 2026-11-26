import { randomUUID } from "node:crypto";
import { toUIMessageStream, type UIMessage } from "ai";
import { appendMessages } from "../db/conversations";
import type { StoredMessage } from "../rules/conversation";
import { answerVisitor, type Visitor } from "./agent";

// The model's own reasoning is never saved, so it never reaches a browser or the inbox.
const withoutReasoning = (message: StoredMessage): StoredMessage => ({
  ...message,
  parts: message.parts.filter((part) => part.type !== "reasoning"),
});

type Turn = { messages: StoredMessage[]; saved: number; visitor: Visitor; returnUrl: string };

// One turn of a conversation: the assistant answers, and when the stream ends everything new is saved.
// The messenger's route and the seed both call this, so seeded conversations took the same path a visitor does.
export async function replyInConversation({ messages, saved, visitor, returnUrl }: Turn) {
  const { reply } = await answerVisitor(messages as UIMessage[], visitor, returnUrl);
  return toUIMessageStream({
    stream: reply.stream,
    originalMessages: messages as UIMessage[],
    generateMessageId: randomUUID,
    sendReasoning: false,
    messageMetadata: () => ({ author: "assistant" }),
    onError: (error) => {
      console.error("site-assistant reply failed", error);
      return "The assistant could not answer just now. Try again in a minute.";
    },
    onFinish: async ({ messages: all }) => {
      await appendMessages(
        visitor.conversationId,
        (all as StoredMessage[]).slice(saved).map(withoutReasoning),
        true,
      );
    },
  });
}
