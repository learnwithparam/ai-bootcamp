import { connect } from "@bootcamp/db";
import { and, cosineDistance, count, eq, gte, sql, sum } from "drizzle-orm";
import type { Source } from "../rules/citations";
import type { Usage } from "../rules/limits";
import type { CatalogEntry, Page } from "../rules/sections";
import * as schema from "./schema";
import { members, pages, sections, supportTeam, turns } from "./schema";

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

export type Account = { id: string; name: string; email: string; createdAt: Date };

// Looks up an account in the shared better-auth table. Only the scripts call this, never the chat.
export async function accountByEmail(email: string): Promise<Account | null> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" where email = ${email.toLowerCase()}`,
  );
  return found.rows[0] ?? null;
}

export async function customerOf(userId: string): Promise<string | null> {
  const [member] = await db.select().from(members).where(eq(members.userId, userId));
  return member?.customerId ?? null;
}

export async function saveMember(userId: string, customerId: string) {
  await db.insert(members).values({ userId, customerId }).onConflictDoNothing();
}

export async function isOnSupportTeam(userId: string): Promise<boolean> {
  const [row] = await db.select().from(supportTeam).where(eq(supportTeam.userId, userId));
  return Boolean(row);
}

export async function addToSupportTeam(userId: string) {
  await db.insert(supportTeam).values({ userId }).onConflictDoNothing();
}

// The pages under one path, each with its first section and its first full paragraph, for the page the messenger sits on.
export async function catalog(prefix: string): Promise<CatalogEntry[]> {
  const found = await db.execute<CatalogEntry>(sql`
    select p.url, p.title,
      coalesce((select s.body from ${sections} s where s.url = p.url order by s.id limit 1), '') as intro,
      coalesce((select s.body from ${sections} s where s.url = p.url and length(s.body) > 140 order by s.id limit 1), '') as blurb
    from ${pages} p where p.url like ${`${prefix}%`} order by p.title`);
  return found.rows;
}
