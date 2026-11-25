import { connect } from "@bootcamp/db";
import { desc, eq, sql } from "drizzle-orm";
import type { DayCount } from "../rules/days";
import * as schema from "./schema";
import { changes, drafts, owners } from "./schema";

export const db = connect(schema);

export type Account = { id: string; name: string; email: string; createdAt: Date };

// Signups per day (UTC) over the last `days` days, read from the shared accounts table.
// Days with no signup are missing here; rules/days.ts fills them in for the chart.
export async function signupsByDay(days: number): Promise<DayCount[]> {
  const found = await db.execute<{ day: string; signups: number }>(sql`
    select to_char(("createdAt" at time zone 'utc')::date, 'YYYY-MM-DD') as day, count(*)::int as signups
    from "user"
    where "createdAt" >= date_trunc('day', now() at time zone 'utc') - make_interval(days => ${days - 1})
    group by 1 order by 1`);
  return found.rows;
}

export async function recentAccounts(limit: number): Promise<Account[]> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" order by "createdAt" desc limit ${limit}`,
  );
  return found.rows;
}

// Only the owner script calls this, never the chat.
export async function accountByEmail(email: string): Promise<Account | null> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" where email = ${email.toLowerCase()}`,
  );
  return found.rows[0] ?? null;
}

export async function isOwner(userId: string): Promise<boolean> {
  const [row] = await db.select().from(owners).where(eq(owners.userId, userId));
  return Boolean(row);
}

export async function addOwner(userId: string) {
  await db.insert(owners).values({ userId }).onConflictDoNothing();
}

export async function saveDraft(draft: typeof drafts.$inferInsert): Promise<number> {
  const [row] = await db.insert(drafts).values(draft).returning({ id: drafts.id });
  if (!row) throw new Error("The draft was not saved.");
  return row.id;
}

export async function latestDrafts(limit: number) {
  return db.select().from(drafts).orderBy(desc(drafts.createdAt)).limit(limit);
}

export async function recordChange(change: typeof changes.$inferInsert) {
  await db.insert(changes).values(change);
}

export async function latestChanges(limit: number) {
  return db.select().from(changes).orderBy(desc(changes.madeAt)).limit(limit);
}
