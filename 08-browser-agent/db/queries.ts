import { connect } from "@bootcamp/db";
import { and, desc, eq, getTableColumns, inArray, lt, type SQL, sql } from "drizzle-orm";
import type { Email } from "../rules/email";
import {
  ACTIVE,
  CLOSED,
  type HistoryRow,
  type InboxRow,
  type Run,
  STALLED_AFTER_MINUTES,
  type Status,
  type Step,
  stalledReason,
} from "../rules/run";
import * as schema from "./schema";
import { emails, runs } from "./schema";

export const db = connect(schema);

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

// Every run, newest first: the desk's audit trail of what the agent did and who decided.
export async function runHistory(): Promise<HistoryRow[]> {
  return db
    .select({
      id: runs.id,
      status: runs.status,
      decidedBy: runs.decidedBy,
      cost: runs.cost,
      createdAt: runs.createdAt,
      finishedAt: runs.finishedAt,
      subject: emails.subject,
      fromName: emails.fromName,
    })
    .from(runs)
    .innerJoin(emails, eq(runs.emailId, emails.id))
    .orderBy(desc(runs.createdAt))
    .limit(200);
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

// A person stopped the run or took it over while the agent was working. The agent's next write throws this,
// and the run ends quietly, with the browser closed.
export class Halted extends Error {}

// Saves the agent's work, but only while the run is still active. Once a person stops it, nothing more is written.
type Change = { [Column in keyof typeof runs.$inferInsert]?: (typeof runs.$inferInsert)[Column] | SQL };

export async function saveRun(id: string, change: Change, screen?: string) {
  const saved = await db
    .update(runs)
    .set({ ...change, ...(screen ? { screen } : {}) })
    .where(and(eq(runs.id, id), inArray(runs.status, ACTIVE)))
    .returning({ id: runs.id });
  if (saved.length === 0) throw new Halted(`Run ${id} is no longer active.`);
}

// Adds one line to the run's log and, when given, replaces the browser picture.
export async function logStep(id: string, step: Step, screen?: string) {
  await saveRun(id, { steps: sql`${runs.steps} || ${JSON.stringify([step])}::jsonb` }, screen);
}

export async function addCost(id: string, cost: number) {
  await db
    .update(runs)
    .set({ cost: sql`${runs.cost} + ${cost}` })
    .where(eq(runs.id, id));
}

// Moves a run on, and only if it is still in one of the statuses given. Two people who approve at the same
// moment cannot both send the request, and a person who stops a run wins over the agent's next move.
export async function moveRun(
  id: string,
  from: Status[],
  to: Status,
  change: Partial<typeof runs.$inferInsert> = {},
): Promise<boolean> {
  const finished = ["submitted", ...CLOSED].includes(to) ? { finishedAt: new Date() } : {};
  const moved = await db
    .update(runs)
    .set({ ...change, ...finished, status: to })
    .where(and(eq(runs.id, id), inArray(runs.status, from)))
    .returning({ id: runs.id });
  return moved.length === 1;
}

// Tests remove what they made.
export async function removeEmails(ids: string[]) {
  if (ids.length > 0) await db.delete(emails).where(inArray(emails.id, ids));
}

export async function addEmail(
  email: Omit<Email, "id" | "receivedAt">,
  receivedAt = new Date(),
): Promise<string> {
  const { fromName, fromEmail, subject, body } = email;
  const [row] = await db
    .insert(emails)
    .values({ fromName, fromEmail, subject, body, receivedAt })
    .returning({ id: emails.id });
  if (!row) throw new Error("The email was not saved.");
  return row.id;
}
