import { and, eq, sql } from "drizzle-orm";
import type { CallUsage } from "../rules/cost";
import { CALL_CEILING_USD, CALL_SECONDS, limitMessage } from "../rules/limits";
import { db } from "./queries";
import { calls } from "./schema";

// The ledger behind the call limits. A call takes its place before the caller is connected, counted at
// the longest and dearest a call may be, and is settled with what it really used once it ends.
// A call that never settles, because the worker stopped, keeps counting at its ceiling.

const midnight = () => new Date(new Date().setHours(0, 0, 0, 0));

export async function usageToday(caller: string, reader: Pick<typeof db, "select"> = db) {
  const today = sql`${calls.startedAt} >= ${midnight()}`;
  const [mine] = await reader
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(calls)
    .where(and(eq(calls.caller, caller), today));
  const [line] = await reader
    .select({
      seconds: sql<number>`coalesce(sum(${calls.seconds}), 0)`.mapWith(Number),
      live: sql<number>`count(*) filter (where ${calls.status} = 'live')`.mapWith(Number),
    })
    .from(calls)
    .where(today);
  return { callerCallsToday: mine?.count ?? 0, secondsToday: line?.seconds ?? 0, live: line?.live ?? 0 };
}

// Takes a place for one call, or says why not. One lock for the whole line, so two callers pressing
// Call at once cannot both take the last place.
export async function reserveCall(caller: string): Promise<{ id: string } | { blocked: string }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('voice_assistant.calls'))`);
    const blocked = limitMessage(await usageToday(caller, tx));
    if (blocked) return { blocked };
    const [row] = await tx
      .insert(calls)
      .values({ caller, seconds: CALL_SECONDS, costUsd: CALL_CEILING_USD })
      .returning({ id: calls.id });
    if (!row) throw new Error("The call ledger returned no row.");
    return { id: row.id };
  });
}

export async function settleCall(
  id: string,
  ended: { seconds: number; costUsd: number; usage: CallUsage; because: string },
) {
  await db
    .update(calls)
    .set({
      status: "ended",
      seconds: ended.seconds,
      costUsd: ended.costUsd,
      usage: ended.usage,
      endedBecause: ended.because,
      endedAt: new Date(),
    })
    .where(eq(calls.id, id));
}

// A call left live for longer than any call may last never reached its worker, or its worker stopped.
// It is closed at its ceiling, so it stops taking a line but keeps counting against the day.
export async function closeStaleCalls() {
  const stale = new Date(Date.now() - (CALL_SECONDS + 120) * 1000);
  await db
    .update(calls)
    .set({ status: "ended", endedBecause: "never settled", endedAt: new Date() })
    .where(and(eq(calls.status, "live"), sql`${calls.startedAt} < ${stale}`));
}
