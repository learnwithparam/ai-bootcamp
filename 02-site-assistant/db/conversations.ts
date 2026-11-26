import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import type { ConversationRecord, StoredMessage } from "../rules/conversation";
import { db } from "./queries";
import { conversations, messages, turns } from "./schema";

export type Conversation = ConversationRecord;
type Start = Pick<Conversation, "id" | "visitor" | "userId" | "name" | "email" | "startedOn">;

// The conversation only if it belongs to this visitor. Anyone else gets nothing, as if it did not exist.
export async function conversationFor(id: string, visitor: string): Promise<Conversation | null> {
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.visitor, visitor)));
  return row ?? null;
}

// The visitor's open conversation from the last week, so the messenger picks up where it was.
export async function latestFor(visitor: string): Promise<Conversation | null> {
  const [row] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.visitor, visitor),
        isNull(conversations.closedAt),
        gte(conversations.updatedAt, sql`now() - interval '7 days'`),
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function messagesOf(id: string): Promise<StoredMessage[]> {
  const rows = await db
    .select({ message: messages.message })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.seq));
  return rows.map((row) => row.message);
}

// False when the id is taken already, so a browser cannot write into someone else's conversation by guessing.
export async function startConversation(start: Start): Promise<boolean> {
  const made = await db
    .insert(conversations)
    .values(start)
    .onConflictDoNothing()
    .returning({ id: conversations.id });
  return made.length === 1;
}

// Adds messages at the end. A message already saved is never changed, so nobody rewrites what was said.
// The conversation row is locked first, so a visitor and a teammate writing at once never get the same place.
export async function appendMessages(id: string, added: StoredMessage[], reopen = false): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, id))
      .for("update");
    for (const message of added) {
      await tx
        .insert(messages)
        .values({
          conversationId: id,
          id: message.id,
          message,
          seq: sql`(select coalesce(max(seq), -1) + 1 from ${messages} where conversation_id = ${id})`,
        })
        .onConflictDoNothing({ target: [messages.conversationId, messages.id] });
    }
    await tx
      .update(conversations)
      .set({ updatedAt: new Date(), ...(reopen ? { closedAt: null } : {}) })
      .where(eq(conversations.id, id));
  });
}

// Moves the conversation to the team, once. A second hand-off changes nothing.
export async function handOffConversation(id: string, summary: string, email: string): Promise<boolean> {
  const moved = await db
    .update(conversations)
    .set({ owner: "team", summary, email, handedOffAt: new Date(), updatedAt: new Date() })
    .where(and(eq(conversations.id, id), eq(conversations.owner, "assistant")))
    .returning({ id: conversations.id });
  return moved.length === 1;
}

// What the conversation cost in model calls, and how many questions the assistant answered in it.
export async function costOf(id: string): Promise<{ answers: number; costUsd: number }> {
  const [row] = await db
    .select({
      answers: sql<number>`count(*)::int`,
      costUsd: sql<number>`coalesce(sum(${turns.costUsd}), 0)::float`,
    })
    .from(turns)
    .where(eq(turns.conversationId, id));
  return { answers: row?.answers ?? 0, costUsd: row?.costUsd ?? 0 };
}
