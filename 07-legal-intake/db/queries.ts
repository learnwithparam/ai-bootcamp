import { createHash, randomBytes } from "node:crypto";
import { connect } from "@bootcamp/db";
import { and, desc, eq, getTableColumns, gte, inArray, sql } from "drizzle-orm";
import type { PartyRecord } from "../rules/conflicts";
import type { Intake, Request, Status } from "../rules/intake";
import * as schema from "./schema";
import { intakes, lawyers, parties } from "./schema";

export const db = connect(schema);

export type Account = { id: string; name: string; email: string; createdAt: Date };

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const { tokenHash: _, ...columns } = getTableColumns(intakes);

// Saves a client's request and returns the private link token. The token itself is never stored.
// Two requests at once from the same email wait for each other, so the daily limit holds.
export async function takeRequest(
  request: Request,
  whyNot: (fromThisEmail: number, today: number) => string | null,
): Promise<{ id: string; token: string } | { refused: string }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('intake:' || ${request.clientEmail}))`);
    const since = sql`now() - interval '1 day'`;
    const [counts] = await tx
      .select({
        fromThisEmail: sql<number>`count(*) filter (where ${intakes.clientEmail} = ${request.clientEmail})::int`,
        today: sql<number>`count(*)::int`,
      })
      .from(intakes)
      .where(gte(intakes.createdAt, since));
    const refused = whyNot(counts?.fromThisEmail ?? 0, counts?.today ?? 0);
    if (refused) return { refused };
    const token = randomBytes(24).toString("base64url");
    const [row] = await tx
      .insert(intakes)
      .values({ ...request, tokenHash: hash(token) })
      .returning({ id: intakes.id });
    if (!row) throw new Error("The request was not saved.");
    return { id: row.id, token };
  });
}

// The client's status page. Only the holder of the link finds the request.
export async function intakeByToken(token: string): Promise<Intake | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const [row] = await db
    .select(columns)
    .from(intakes)
    .where(eq(intakes.tokenHash, hash(token)));
  return row ?? null;
}

export async function intakeById(id: string): Promise<Intake | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select(columns).from(intakes).where(eq(intakes.id, id));
  return row ?? null;
}

export async function queue(limit = 50): Promise<Intake[]> {
  return db.select(columns).from(intakes).orderBy(desc(intakes.createdAt)).limit(limit);
}

export async function updateIntake(id: string, change: Partial<typeof intakes.$inferInsert>) {
  await db.update(intakes).set(change).where(eq(intakes.id, id));
}

// Moves a request from one status to the next, and only if it is still in the first one.
// Two lawyers who press at the same moment cannot both resume the graph: one of them gets false.
export async function claim(id: string, from: Status, to: Status): Promise<boolean> {
  const moved = await db
    .update(intakes)
    .set({ status: to })
    .where(and(eq(intakes.id, id), eq(intakes.status, from)))
    .returning({ id: intakes.id });
  return moved.length === 1;
}

export async function addCost(id: string, cost: number) {
  await db
    .update(intakes)
    .set({ cost: sql`${intakes.cost} + ${cost}` })
    .where(eq(intakes.id, id));
}

export async function partyRecords(): Promise<PartyRecord[]> {
  return db.select({ name: parties.name, role: parties.role, matter: parties.matter }).from(parties);
}

export async function isLawyer(userId: string): Promise<boolean> {
  const [row] = await db.select().from(lawyers).where(eq(lawyers.userId, userId));
  return Boolean(row);
}

export async function addLawyer(userId: string) {
  await db.insert(lawyers).values({ userId }).onConflictDoNothing();
}

// Only the lawyer script calls this, never a page.
export async function accountByEmail(email: string): Promise<Account | null> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" where email = ${email.toLowerCase()}`,
  );
  return found.rows[0] ?? null;
}

// Tests remove what they made.
export async function removeIntakes(ids: string[]) {
  if (ids.length > 0) await db.delete(intakes).where(inArray(intakes.id, ids));
}
