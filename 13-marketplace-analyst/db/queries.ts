import { connect } from "@bootcamp/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { StoredMessage } from "../rules/message";
import { conversations, messages } from "./schema";

// Saved chats. Every read and write names the user, so nobody opens another person's conversation.

export const db = connect({ conversations, messages });

export async function listConversations(userId: string) {
  return db
    .select({ id: conversations.id, title: conversations.title })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(30);
}

async function ownerOf(id: string): Promise<string | undefined> {
  const [row] = await db
    .select({ userId: conversations.userId })
    .from(conversations)
    .where(eq(conversations.id, id));
  return row?.userId;
}

export async function messagesOf(id: string, userId: string): Promise<StoredMessage[]> {
  const rows = await db
    .select({ message: messages.message })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .orderBy(asc(messages.seq));
  return rows.map((row) => row.message);
}

// Creates the conversation on its first message. Returns false when the id is someone else's.
export async function openConversation(id: string, userId: string, title: string): Promise<boolean> {
  await db
    .insert(conversations)
    .values({ id, userId, title: title.slice(0, 80) })
    .onConflictDoNothing();
  return (await ownerOf(id)) === userId;
}

export async function saveMessage(conversationId: string, message: StoredMessage) {
  const next = sql<number>`(SELECT coalesce(max(seq), 0) + 1 FROM ${messages}
    WHERE ${messages.conversationId} = ${conversationId})`;
  await db
    .insert(messages)
    .values({ conversationId, id: message.id, seq: next, message })
    .onConflictDoUpdate({ target: [messages.conversationId, messages.id], set: { message } });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
}
