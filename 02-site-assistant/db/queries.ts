import { connect } from "@bootcamp/db";
import { and, asc, cosineDistance, count, eq, gte, isNull, sql, sum } from "drizzle-orm";
import type { Source } from "../rules/citations";
import type { Usage } from "../rules/limits";
import type { Page } from "../rules/sections";
import * as schema from "./schema";
import { pages, sections, tickets, turns } from "./schema";

export const db = connect(schema);

// Replaces a page and its sections in one transaction, so a search never sees half a page.
export async function savePage(url: string, page: Page, embeddings: number[][]) {
  await db.transaction(async (tx) => {
    await tx
      .insert(pages)
      .values({ url, title: page.title })
      .onConflictDoUpdate({ target: pages.url, set: { title: page.title, fetchedAt: sql`now()` } });
    await tx.delete(sections).where(eq(sections.url, url));
    const rows = page.sections.map((section, index) => ({
      url,
      ...section,
      embedding: embeddings[index] as number[],
    }));
    if (rows.length) await tx.insert(sections).values(rows);
  });
}

// The sections whose meaning is closest to the question, numbered from 1 so the answer can cite them.
export async function searchSections(embedding: number[], limit: number): Promise<Source[]> {
  const rows = await db
    .select({ url: sections.url, title: pages.title, heading: sections.heading, body: sections.body })
    .from(sections)
    .innerJoin(pages, eq(pages.url, sections.url))
    .orderBy(cosineDistance(sections.embedding, embedding))
    .limit(limit);
  return rows.map((row, index) => ({ number: index + 1, ...row }));
}

export async function countPages(): Promise<number> {
  const [row] = await db.select({ pages: count() }).from(pages);
  return row?.pages ?? 0;
}

// The visitor's questions in the last minute, and everyone's spend since midnight UTC.
export async function usageFor(visitor: string): Promise<Usage> {
  const lastMinute = sql`now() - interval '1 minute'`;
  const midnight = sql`date_trunc('day', now() at time zone 'utc') at time zone 'utc'`;
  const [mine] = await db
    .select({ questions: count() })
    .from(turns)
    .where(and(eq(turns.visitor, visitor), gte(turns.askedAt, lastMinute)));
  const [today] = await db
    .select({ spent: sum(turns.costUsd).mapWith(Number) })
    .from(turns)
    .where(gte(turns.askedAt, midnight));
  return { questionsLastMinute: mine?.questions ?? 0, spentTodayUsd: today?.spent ?? 0 };
}

export async function recordTurn(turn: typeof turns.$inferInsert) {
  await db.insert(turns).values(turn);
}

export async function openTicket(ticket: typeof tickets.$inferInsert): Promise<number> {
  const [row] = await db.insert(tickets).values(ticket).returning({ id: tickets.id });
  if (!row) throw new Error("The ticket was not saved.");
  return row.id;
}

// Open tickets, oldest first: the visitor who has waited longest is answered first.
export async function openTickets() {
  return db.select().from(tickets).where(isNull(tickets.answeredAt)).orderBy(asc(tickets.openedAt));
}

// Marks a ticket answered only if nobody else has, so two people never answer the same visitor.
export async function markAnswered(id: number, answeredBy: string): Promise<boolean> {
  const changed = await db
    .update(tickets)
    .set({ answeredBy, answeredAt: sql`now()` })
    .where(and(eq(tickets.id, id), isNull(tickets.answeredAt)))
    .returning({ id: tickets.id });
  return changed.length === 1;
}
