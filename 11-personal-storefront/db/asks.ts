import { and, eq, sql } from "drizzle-orm";
import { ASK_CEILING_USD, limitMessage } from "../rules/state";
import { db } from "./queries";
import { asks } from "./schema";

// The ledger behind the daily limits. An ask takes its place before the model is called, at the most it
// may cost, and is settled with what it really cost once it finishes. Two asks sent at once both count,
// and one that fails or is stopped part way keeps counting at its ceiling.

const midnight = () => new Date(new Date().setHours(0, 0, 0, 0));

// What one shopper asked today, and what the whole shop spent today, for the limits in rules/state.ts.
export async function usageToday(owner: string, reader: Pick<typeof db, "select"> = db) {
  const today = sql`${asks.createdAt} >= ${midnight()}`;
  const [mine] = await reader
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(asks)
    .where(and(eq(asks.owner, owner), today));
  const [shop] = await reader
    .select({ spent: sql<number>`coalesce(sum(${asks.costUsd}), 0)`.mapWith(Number) })
    .from(asks)
    .where(today);
  return { asks: mine?.count ?? 0, spent: shop?.spent ?? 0 };
}

// Takes a place for one ask, or says why not. One lock for the whole shop, so the check and the
// reservation can never be split by another ask arriving in between.
export async function reserveAsk(owner: string): Promise<{ id: string } | { blocked: string }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('personal_storefront.asks'))`);
    const blocked = limitMessage(await usageToday(owner, tx));
    if (blocked) return { blocked };
    const [row] = await tx
      .insert(asks)
      .values({ owner, costUsd: ASK_CEILING_USD })
      .returning({ id: asks.id });
    if (!row) throw new Error("The ask ledger returned no row.");
    return { id: row.id };
  });
}

export async function settleAsk(id: string, costUsd: number) {
  await db.update(asks).set({ costUsd, settled: true }).where(eq(asks.id, id));
}
