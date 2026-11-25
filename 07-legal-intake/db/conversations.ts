import { createHash } from "node:crypto";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { type Draft, EMPTY_DRAFT } from "../rules/collect";
import type { Turn } from "../rules/intake";
import { db } from "./queries";
import { conversations } from "./schema";

// The public intake conversation, kept on the server until the client sends it.

export type Conversation = { id: string; transcript: Turn[]; draft: Draft; turns: number };

const columns = {
  id: conversations.id,
  transcript: conversations.transcript,
  draft: conversations.draft,
  turns: conversations.turns,
};

export const visitorHash = (address: string) =>
  createHash("sha256").update(`legal-intake:${address}`).digest("hex");

export async function startConversation(visitor: string, opening: Turn): Promise<Conversation> {
  const [row] = await db
    .insert(conversations)
    .values({ visitorHash: visitor, transcript: [opening], draft: EMPTY_DRAFT })
    .returning(columns);
  if (!row) throw new Error("The conversation was not saved.");
  return row;
}

// Only a conversation that has not been sent can be read or added to.
export async function openConversation(id: string): Promise<Conversation | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select(columns)
    .from(conversations)
    .where(and(eq(conversations.id, id), isNull(conversations.intakeId)));
  return row ?? null;
}

// Turns taken in the last day, by this visitor and by everyone. The limits in rules/collect.ts read these.
export async function turnsToday(visitor: string): Promise<{ visitor: number; everyone: number }> {
  const [counts] = await db
    .select({
      visitor: sql<number>`coalesce(sum(${conversations.turns}) filter (where ${conversations.visitorHash} = ${visitor}), 0)::int`,
      everyone: sql<number>`coalesce(sum(${conversations.turns}), 0)::int`,
    })
    .from(conversations)
    .where(gte(conversations.createdAt, sql`now() - interval '1 day'`));
  return counts ?? { visitor: 0, everyone: 0 };
}

export async function saveTurn(id: string, transcript: Turn[], draft: Draft, cost: number) {
  await db
    .update(conversations)
    .set({
      transcript,
      draft,
      turns: sql`${conversations.turns} + 1`,
      cost: sql`${conversations.cost} + ${cost}`,
    })
    .where(eq(conversations.id, id));
}

export async function markSent(id: string, intakeId: string) {
  await db.update(conversations).set({ intakeId }).where(eq(conversations.id, id));
}
