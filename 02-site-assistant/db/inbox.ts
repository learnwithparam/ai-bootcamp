import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { InboxRow, StoredMessage } from "../rules/conversation";
import { appendMessages } from "./conversations";
import { db } from "./queries";
import { conversations, messages } from "./schema";

// The support inbox's side of a conversation. Every function here is called only after requireSupport.

// Newest first, each with its latest message. A conversation with no message yet is never listed.
export async function inboxRows(): Promise<InboxRow[]> {
  const rows = await db
    .select({
      id: conversations.id,
      name: conversations.name,
      email: conversations.email,
      owner: conversations.owner,
      assigneeId: conversations.assigneeId,
      assigneeName: conversations.assigneeName,
      closedAt: conversations.closedAt,
      updatedAt: conversations.updatedAt,
      summary: conversations.summary,
    })
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))
    .limit(300);
  if (rows.length === 0) return [];
  const latest = await db
    .selectDistinctOn([messages.conversationId], { id: messages.conversationId, message: messages.message })
    .from(messages)
    .where(
      inArray(
        messages.conversationId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(messages.conversationId, desc(messages.seq));
  const lastOf = new Map(latest.map((each) => [each.id, each.message as StoredMessage]));
  return rows.flatMap((row) => {
    const last = lastOf.get(row.id);
    return last ? [{ ...row, last }] : [];
  });
}

export async function conversationById(id: string) {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id));
  return row ?? null;
}

type Teammate = { id: string; name: string };

// Takes an unassigned conversation. Only one of two people clicking at once gets it.
export async function assign(id: string, teammate: Teammate): Promise<boolean> {
  const taken = await db
    .update(conversations)
    .set({ owner: "team", assigneeId: teammate.id, assigneeName: teammate.name, updatedAt: new Date() })
    .where(and(eq(conversations.id, id), isNull(conversations.assigneeId)))
    .returning({ id: conversations.id });
  return taken.length === 1;
}

// A reply moves the conversation to the team for good, and to the person replying if nobody had it.
// It also reopens a closed one, the way a reply in Intercom does.
export async function reply(id: string, teammate: Teammate, message: StoredMessage): Promise<void> {
  await appendMessages(id, [message], true);
  await db
    .update(conversations)
    .set({
      owner: "team",
      assigneeId: sql`coalesce(${conversations.assigneeId}, ${teammate.id})`,
      assigneeName: sql`coalesce(${conversations.assigneeName}, ${teammate.name})`,
    })
    .where(eq(conversations.id, id));
}

// Closes a conversation that is open. Closing it twice changes nothing.
export async function close(id: string): Promise<boolean> {
  const closed = await db
    .update(conversations)
    .set({ closedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(conversations.id, id), isNull(conversations.closedAt)))
    .returning({ id: conversations.id });
  return closed.length === 1;
}
