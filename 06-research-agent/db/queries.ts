import { connect } from "@bootcamp/db";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { whyNotStart } from "../rules/limits";
import type { Person, Role, View } from "../rules/team";
import * as schema from "./schema";
import { members, type Report, reports } from "./schema";

export const db = connect(schema);

export async function startReport(company: string, createdBy: string, ownerId: string | null = null) {
  const [row] = await db
    .insert(reports)
    .values({ company, createdBy, ownerId })
    .returning({ id: reports.id });
  if (!row) throw new Error("The report was not saved.");
  return row.id;
}

// The graph calls this after each step with what it has so far.
export async function updateReport(id: string, change: Partial<typeof reports.$inferInsert>) {
  await db.update(reports).set(change).where(eq(reports.id, id));
}

// The table is shared by the sales team, so any signed-in member may open any account.
export async function findReport(id: string): Promise<Report | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(reports).where(eq(reports.id, id));
  return row ?? null;
}

export async function teamReports(view: View, userId: string, limit = 100): Promise<Report[]> {
  const where =
    view === "mine"
      ? eq(reports.ownerId, userId)
      : view === "unassigned"
        ? isNull(reports.ownerId)
        : undefined;
  return db.select().from(reports).where(where).orderBy(desc(reports.createdAt)).limit(limit);
}

export async function viewCounts(userId: string) {
  const [row] = await db
    .select({
      all: count(),
      mine: sql<number>`count(*) filter (where ${reports.ownerId} = ${userId})`.mapWith(Number),
      unassigned: sql<number>`count(*) filter (where ${reports.ownerId} is null)`.mapWith(Number),
    })
    .from(reports);
  return { all: row?.all ?? 0, mine: row?.mine ?? 0, unassigned: row?.unassigned ?? 0 };
}

// Taking an account only works while nobody owns it, so two reps clicking at once cannot both get it.
export async function takeReport(id: string, userId: string): Promise<boolean> {
  const taken = await db
    .update(reports)
    .set({ ownerId: userId })
    .where(and(eq(reports.id, id), isNull(reports.ownerId)))
    .returning({ id: reports.id });
  return taken.length === 1;
}

export async function assignReport(id: string, ownerId: string | null) {
  await db.update(reports).set({ ownerId }).where(eq(reports.id, id));
}

export async function roleOf(userId: string): Promise<Role> {
  await db.insert(members).values({ userId }).onConflictDoNothing();
  const [row] = await db.select({ role: members.role }).from(members).where(eq(members.userId, userId));
  return row?.role ?? "rep";
}

export async function setRole(userId: string, role: Role) {
  await db
    .insert(members)
    .values({ userId, role })
    .onConflictDoUpdate({ target: members.userId, set: { role } });
}

// Everyone on the team, for the owner column and the lead's Assign menu.
export async function teamPeople(): Promise<Person[]> {
  const found = await db.execute<Person>(
    sql`select u.id, u.name, u.email, u."createdAt" from "user" u
        join ${members} m on m.user_id = u.id order by u.name`,
  );
  return found.rows;
}

export async function accountByEmail(email: string): Promise<Person | null> {
  const found = await db.execute<Person>(
    sql`select id, name, email, "createdAt" from "user" where email = ${email.toLowerCase()}`,
  );
  return found.rows[0] ?? null;
}

// How many accounts this person has being researched now, and how many they added in the last 24 hours.
type Database = Pick<typeof db, "select">;

export async function usage(userId: string, on: Database = db) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const mine = eq(reports.createdBy, userId);
  const [running] = await on
    .select({ total: count() })
    .from(reports)
    .where(and(mine, eq(reports.status, "running")));
  const [today] = await on
    .select({ total: count() })
    .from(reports)
    .where(and(mine, gte(reports.createdAt, since)));
  return { runningNow: running?.total ?? 0, startedToday: today?.total ?? 0 };
}

// Two quick pastes must not both pass the limits. A lock per person makes the second wait
// until the first has saved its rows, so it counts them and is refused.
export async function startWithinLimits(
  companies: string[],
  userId: string,
  ownerId: string | null,
): Promise<{ ids?: string[]; refused?: string }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`research:${userId}`}))`);
    const { runningNow, startedToday } = await usage(userId, tx);
    const refused = whyNotStart(runningNow, startedToday, companies.length);
    if (refused) return { refused };
    const rows = await tx
      .insert(reports)
      .values(companies.map((company) => ({ company, createdBy: userId, ownerId })))
      .returning({ id: reports.id });
    return { ids: rows.map((row) => row.id) };
  });
}
