import { connect } from "@bootcamp/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import * as schema from "./schema";
import { chats, members, messages } from "./schema";

export const db = connect(schema);

export type Role = "member" | "admin";
export type Account = { id: string; name: string; email: string; createdAt: Date };
// A message as the chat shows it. The agent reads it as the AI SDK's UIMessage.
export type StoredMessage = { id: string; role: "system" | "user" | "assistant"; parts: unknown[] };

// Only the member script calls this, never the chat.
export async function accountByEmail(email: string): Promise<Account | null> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" where lower(email) = lower(${email})`,
  );
  return found.rows[0] ?? null;
}

export async function addMember(userId: string, role: Role): Promise<void> {
  await db
    .insert(members)
    .values({ userId, role })
    .onConflictDoUpdate({ target: members.userId, set: { role } });
}

export async function roleOf(userId: string): Promise<Role | null> {
  const [member] = await db.select({ role: members.role }).from(members).where(eq(members.userId, userId));
  return member?.role ?? null;
}

export async function chatsOf(userId: string, limit = 50) {
  return db
    .select({ id: chats.id, title: chats.title, updatedAt: chats.updatedAt })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .limit(limit);
}

// The chat, only when this person owns it. Anyone else gets null, the same as a chat that does not exist.
export async function chatFor(chatId: string, userId: string) {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  return chat ?? null;
}

// Makes the chat on its first message. A chat id someone else already owns is refused.
export async function openChat(chatId: string, userId: string, title: string) {
  await db.insert(chats).values({ id: chatId, userId, title }).onConflictDoNothing();
  return chatFor(chatId, userId);
}

export async function messagesOf(chatId: string): Promise<StoredMessage[]> {
  const rows = await db
    .select({ id: messages.id, role: messages.role, parts: messages.parts })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.seq));
  return rows.map((row) => ({ ...row, parts: row.parts as unknown[] }));
}

// Saves the whole conversation after a reply, in one transaction, and adds the reply's cost to the chat.
export async function saveMessages(chatId: string, all: StoredMessage[], cost: number): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [seq, message] of all.entries()) {
      const row = { chatId, id: message.id, seq, role: message.role, parts: message.parts };
      await tx
        .insert(messages)
        .values(row)
        .onConflictDoUpdate({ target: [messages.chatId, messages.id], set: { seq, parts: message.parts } });
    }
    await tx
      .update(chats)
      .set({ updatedAt: new Date(), cost: sql`${chats.cost} + ${cost}` })
      .where(eq(chats.id, chatId));
  });
}

export async function deleteChat(chatId: string, userId: string): Promise<void> {
  await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
}
