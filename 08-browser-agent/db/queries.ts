import { connect } from "@bootcamp/db";
import { and, eq, getTableColumns, inArray, lt, sql } from "drizzle-orm";
import type { Email } from "../rules/email";
import {
  ACTIVE,
  type InboxRow,
  type Run,
  STALLED_AFTER_MINUTES,
  type Status,
  type Step,
  stalledReason,
} from "../rules/run";
import * as schema from "./schema";
import { emails, operators, runs } from "./schema";

export const db = connect(schema);

export type Account = { id: string; name: string; email: string; createdAt: Date };

const { screen: _, ...columns } = getTableColumns(runs);

// Starts a run on one email, if the rules allow. Two clicks at once wait for each other, so the limits hold.
// Marks runs that stopped writing as failed, so they never block their email. Called before each start and page load.
export async function failStalled(executor: Pick<typeof db, "update"> = db): Promise<number> {
  const stalled = await executor
    .update(runs)
    .set({
      status: "failed",
      finishedAt: new Date(),
      reason: sql`case when ${runs.status} = 'submitting' then ${stalledReason("submitting")} else ${stalledReason("reading")} end`,
    })
    .where(
      and(
        inArray(runs.status, ACTIVE),
        lt(runs.updatedAt, sql`now() - make_interval(mins => ${STALLED_AFTER_MINUTES})`),
      ),
    )
    .returning({ id: runs.id });
  return stalled.length;
}

export async function startRun(
  emailId: string,
  whyNot: (active: number, earlier: Status[]) => string | null,
): Promise<{ id: string } | { refused: string }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('browser-agent:runs'))`);
    await failStalled(tx);
    const [counts] = await tx
      .select({ active: sql<number>`count(*)::int` })
      .from(runs)
      .where(inArray(runs.status, ACTIVE));
    const earlier = await tx.select({ status: runs.status }).from(runs).where(eq(runs.emailId, emailId));
    const refused = whyNot(
      counts?.active ?? 0,
      earlier.map((run) => run.status),
    );
    if (refused) return { refused };
    const [row] = await tx.insert(runs).values({ emailId }).returning({ id: runs.id });
    if (!row) throw new Error("The run was not saved.");
    return { id: row.id };
  });
}

// Each email with the status of its latest run, newest email first.
export async function inbox(): Promise<InboxRow[]> {
  const rows = await db.execute<InboxRow>(sql`
    select e.id, e.from_name as "fromName", e.from_email as "fromEmail", e.subject, e.body,
      e.received_at as "receivedAt", r.id as "runId", r.status
    from browser_agent.emails e
    left join lateral (
      select id, status from browser_agent.runs where email_id = e.id order by created_at desc limit 1
    ) r on true
    order by e.received_at desc`);
  return rows.rows;
}

export async function emailById(id: string): Promise<Email | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(emails).where(eq(emails.id, id));
  return row ?? null;
}

export async function runById(id: string): Promise<Run | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select(columns).from(runs).where(eq(runs.id, id));
  return row ?? null;
}

export async function screenOf(id: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select({ screen: runs.screen }).from(runs).where(eq(runs.id, id));
  return row?.screen ?? null;
}

export async function updateRun(id: string, change: Partial<typeof runs.$inferInsert>) {
  await db.update(runs).set(change).where(eq(runs.id, id));
}

// Adds one line to the run's log and, when given, replaces the browser picture.
export async function logStep(id: string, step: Step, screen?: string) {
  await db
    .update(runs)
    .set({
      steps: sql`${runs.steps} || ${JSON.stringify([step])}::jsonb`,
      ...(screen ? { screen } : {}),
    })
    .where(eq(runs.id, id));
}

export async function addCost(id: string, cost: number) {
  await db
    .update(runs)
    .set({ cost: sql`${runs.cost} + ${cost}` })
    .where(eq(runs.id, id));
}

// Moves a run from one status to the next, and only if it is still in the first one.
// Two people who approve at the same moment cannot both send the request: one of them gets false.
export async function claim(id: string, from: Status, to: Status): Promise<boolean> {
  const moved = await db
    .update(runs)
    .set({ status: to })
    .where(and(eq(runs.id, id), eq(runs.status, from)))
    .returning({ id: runs.id });
  return moved.length === 1;
}

export async function isOperator(userId: string): Promise<boolean> {
  const [row] = await db.select().from(operators).where(eq(operators.userId, userId));
  return Boolean(row);
}

export async function addOperator(userId: string) {
  await db.insert(operators).values({ userId }).onConflictDoNothing();
}

// Only the operator script calls this, never a page.
export async function accountByEmail(email: string): Promise<Account | null> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" where email = ${email.toLowerCase()}`,
  );
  return found.rows[0] ?? null;
}

// Tests remove what they made.
export async function removeEmails(ids: string[]) {
  if (ids.length > 0) await db.delete(emails).where(inArray(emails.id, ids));
}

export async function addEmail(email: Omit<Email, "id" | "receivedAt">): Promise<string> {
  const [row] = await db.insert(emails).values(email).returning({ id: emails.id });
  if (!row) throw new Error("The email was not saved.");
  return row.id;
}
