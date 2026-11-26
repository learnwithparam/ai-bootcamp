import { eq, sql } from "drizzle-orm";
import { type Role, type Verdict, whyCannotReview } from "../rules/review";
import { db, isId } from "./queries";
import { members, reviews, runs } from "./schema";

// The team and its reviews. A review is checked against the rules inside the same transaction that saves it,
// with the run locked, so the rules hold even when two people press a button at once.

export type Account = { id: string; name: string; email: string; createdAt: Date };

export async function roleOf(userId: string): Promise<Role | null> {
  const [row] = await db.select({ role: members.role }).from(members).where(eq(members.userId, userId));
  return row?.role ?? null;
}

export async function addMember(userId: string, role: Role) {
  await db
    .insert(members)
    .values({ userId, role })
    .onConflictDoUpdate({ target: members.userId, set: { role } });
}

// Only the member script and the seed call this, never a page.
export async function accountByEmail(email: string): Promise<Account | null> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" where email = ${email.toLowerCase()}`,
  );
  return found.rows[0] ?? null;
}

export type ReviewAsk = { runId: string; reviewerId: string; verdict: Verdict; note: string };

export async function addReview(ask: ReviewAsk): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isId(ask.runId)) return { ok: false, reason: "There is no such run." };
  return db.transaction(async (tx) => {
    const [run] = await tx
      .select({ userId: runs.userId, outcome: runs.outcome, filesChanged: runs.filesChanged })
      .from(runs)
      .where(eq(runs.id, ask.runId))
      .for("update");
    if (!run) return { ok: false, reason: "There is no such run." };
    const [member] = await tx
      .select({ role: members.role })
      .from(members)
      .where(eq(members.userId, ask.reviewerId));
    const person = { id: ask.reviewerId, role: member?.role ?? ("developer" as Role) };
    const reason = member
      ? whyCannotReview(person, run, ask.verdict, ask.note)
      : "Only a reviewer can review a run.";
    if (reason) return { ok: false, reason };
    await tx.insert(reviews).values({ ...ask, note: ask.note.trim() });
    return { ok: true };
  });
}
