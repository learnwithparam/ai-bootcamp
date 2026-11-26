import type { Item, Kind } from "@bootcamp/catalog";
import { pool } from "@bootcamp/db";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { cliClient, items, saved } from "./schema";

export const db = drizzle(pool);

const columns = {
  kind: items.kind,
  title: items.title,
  url: items.url,
  date: items.date,
  duration: items.duration,
  summary: items.summary,
};

// Replaces the catalog with the one just read from the site. One transaction, so a search never sees half of it.
export async function replaceCatalog(catalog: Item[]): Promise<void> {
  await db.transaction(async (tx) => {
    const urls = catalog.map((item) => item.url);
    await tx.delete(items).where(notInArray(items.url, urls));
    for (const item of catalog) {
      await tx.insert(items).values(item).onConflictDoUpdate({ target: items.url, set: item });
    }
  });
}

export async function allItems(): Promise<Item[]> {
  return (await db.select(columns).from(items)) as Item[];
}

// Postgres full-text search: words are matched by their stem, so "evals" finds "eval".
export async function searchItems(query: string, kind: Kind | undefined, limit: number): Promise<Item[]> {
  const document = sql`to_tsvector('english', ${items.title} || ' ' || ${items.summary})`;
  const wanted = sql`websearch_to_tsquery('english', ${query})`;
  const found = await db
    .select(columns)
    .from(items)
    .where(and(sql`${document} @@ ${wanted}`, kind ? eq(items.kind, kind) : undefined))
    .orderBy(desc(sql`ts_rank(${document}, ${wanted})`))
    .limit(limit);
  return found as Item[];
}

export async function itemByUrl(url: string): Promise<Item | null> {
  const [found] = await db.select(columns).from(items).where(eq(items.url, url));
  return (found as Item | undefined) ?? null;
}

// Saving twice is not an error: the list keeps one copy.
export async function saveItem(userId: string, url: string): Promise<void> {
  await db.insert(saved).values({ userId, url }).onConflictDoNothing();
}

export async function savedItems(userId: string): Promise<Item[]> {
  const found = await db
    .select(columns)
    .from(saved)
    .innerJoin(items, eq(saved.url, items.url))
    .where(eq(saved.userId, userId))
    .orderBy(desc(saved.savedAt));
  return found as Item[];
}

export async function cliClientId(): Promise<string | null> {
  const [found] = await db.select().from(cliClient).limit(1);
  return found?.clientId ?? null;
}

export async function saveCliClientId(clientId: string): Promise<void> {
  await db.insert(cliClient).values({ clientId });
}
