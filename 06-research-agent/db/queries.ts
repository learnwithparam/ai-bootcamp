import { connect } from "@bootcamp/db";
import { and, count, desc, eq, gte } from "drizzle-orm";
import * as schema from "./schema";
import { type Report, reports } from "./schema";

export const db = connect(schema);

export async function startReport(company: string, createdBy: string): Promise<string> {
  const [row] = await db.insert(reports).values({ company, createdBy }).returning({ id: reports.id });
  if (!row) throw new Error("The report was not saved.");
  return row.id;
}

// The graph calls this after each step with what it has so far.
export async function updateReport(id: string, change: Partial<typeof reports.$inferInsert>) {
  await db.update(reports).set(change).where(eq(reports.id, id));
}

// A report belongs to the account that asked for it. Anyone else gets nothing, as if it did not exist.
export async function findReport(id: string, userId: string): Promise<Report | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.createdBy, userId)));
  return row ?? null;
}

export async function reportsBy(userId: string, limit = 20): Promise<Report[]> {
  return db
    .select()
    .from(reports)
    .where(eq(reports.createdBy, userId))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}

// How many reports this account has running now, and how many it started in the last 24 hours.
export async function usage(userId: string): Promise<{ runningNow: number; startedToday: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [running] = await db
    .select({ total: count() })
    .from(reports)
    .where(and(eq(reports.createdBy, userId), eq(reports.status, "running")));
  const [today] = await db
    .select({ total: count() })
    .from(reports)
    .where(and(eq(reports.createdBy, userId), gte(reports.createdAt, since)));
  return { runningNow: running?.total ?? 0, startedToday: today?.total ?? 0 };
}
