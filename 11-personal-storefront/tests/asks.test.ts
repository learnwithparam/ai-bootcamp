import { afterAll, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { reserveAsk, settleAsk, usageToday } from "../db/asks";
import { db } from "../db/queries";
import { asks } from "../db/schema";
import { ASK_CEILING_USD, ASKS_PER_DAY } from "../rules/state";

// The daily limits against the real database, with no model: the ledger, not the model, keeps the count.

const OWNER = `guest:asks-test-${crypto.randomUUID()}`;
afterAll(() => db.delete(asks).where(eq(asks.owner, OWNER)));

describe("the ask ledger", () => {
  test("asks sent all at once take no more places than the limit", async () => {
    const tries = await Promise.all(Array.from({ length: ASKS_PER_DAY + 5 }, () => reserveAsk(OWNER)));
    expect(tries.filter((one) => "id" in one)).toHaveLength(ASKS_PER_DAY);
    expect(tries.filter((one) => "blocked" in one)).toHaveLength(5);
    // Each ask waits its turn for the one lock, so 45 of them take a while next to a running shop.
  }, 30_000);

  test("an ask that never finishes keeps counting at its ceiling, and a finished one at its cost", async () => {
    await db.delete(asks).where(eq(asks.owner, OWNER));
    const before = await usageToday(OWNER);
    const [failed, finished] = await Promise.all([reserveAsk(OWNER), reserveAsk(OWNER)]);
    if (!failed || !finished || !("id" in finished)) throw new Error("Both asks should have a place.");
    await settleAsk(finished.id, 0.001);
    const after = await usageToday(OWNER);
    expect(after.asks).toBe(2);
    expect(after.spent - before.spent).toBeCloseTo(ASK_CEILING_USD + 0.001, 5);
  });
});

describe("the cost of one ask", () => {
  test("every model call caps what it may write, so one ask cannot pass its ceiling", () => {
    const folder = join(import.meta.dir, "../agent");
    const calls = readdirSync(folder)
      .filter((name) => name.endsWith(".ts"))
      .flatMap((name) =>
        readFileSync(join(folder, name), "utf8")
          .split(/(?=(?:generateText|streamText)\()/)
          .slice(1),
      );
    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (const call of calls) expect(call.slice(0, 400)).toContain("maxOutputTokens");
  });
});
