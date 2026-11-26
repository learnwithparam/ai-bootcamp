import { connect } from "@bootcamp/db";
import { desc, eq, sql } from "drizzle-orm";
import type { DayCount } from "../rules/days";
import * as schema from "./schema";
import { changes, type Role, team } from "./schema";

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

export const CUSTOMERS_PER_PAGE = 25;

// The Customers page: newest first, filtered by a name or email search, one page at a time.
export async function customerPage(search: string, page: number) {
  const pattern = `%${search.trim().toLowerCase()}%`;
  const offset = Math.max(0, page - 1) * CUSTOMERS_PER_PAGE;
  const [rows, total] = await Promise.all([
    db.execute<Account>(sql`select id, name, email, "createdAt" from "user"
      where lower(name) like ${pattern} or email like ${pattern}
      order by "createdAt" desc limit ${CUSTOMERS_PER_PAGE} offset ${offset}`),
    db.execute<{ count: number }>(sql`select count(*)::int as count from "user"
      where lower(name) like ${pattern} or email like ${pattern}`),
  ]);
  return { accounts: rows.rows, total: total.rows[0]?.count ?? 0 };
}

export async function accountCount(): Promise<number> {
  const found = await db.execute<{ count: number }>(sql`select count(*)::int as count from "user"`);
  return found.rows[0]?.count ?? 0;
}

// Only the team script calls this, never the assistant.
export async function accountByEmail(email: string): Promise<Account | null> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" where email = ${email.toLowerCase()}`,
  );
  return found.rows[0] ?? null;
}

export async function roleOf(userId: string): Promise<Role | null> {
  const [row] = await db.select().from(team).where(eq(team.userId, userId));
  return row?.role ?? null;
}

export async function addToTeam(userId: string, role: Role) {
  await db.insert(team).values({ userId, role }).onConflictDoUpdate({ target: team.userId, set: { role } });
}

export async function recordChange(change: typeof changes.$inferInsert) {
  await db.insert(changes).values(change);
}

// Each change with the name of the person who made it or asked the assistant for it.
export async function latestChanges(limit: number) {
  const found = await db.execute<{
    id: number;
    name: string | null;
    by: string;
    action: string;
    detail: unknown;
    madeAt: Date;
  }>(sql`
    select c.id, u.name, c.by, c.action, c.detail, c.made_at as "madeAt"
    from admin_assistant.changes c left join "user" u on u.id = c.user_id
    order by c.made_at desc limit ${limit}`);
  return found.rows;
}

export async function lastChangeTime() {
  const [row] = await db
    .select({ madeAt: changes.madeAt })
    .from(changes)
    .orderBy(desc(changes.madeAt))
    .limit(1);
  return row?.madeAt ?? null;
}
