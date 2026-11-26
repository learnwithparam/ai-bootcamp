import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { reserveCall, settleCall, usageToday } from "../db/calls";
import { bookingsFor, bookingsOfCaller, bookSlot, cancelBooking } from "../db/diary";
import { addLine, db, linesOf } from "../db/queries";
import { bookings, calls } from "../db/schema";
import { NO_USAGE } from "../rules/cost";
import {
  CALL_SECONDS,
  CALLS_AT_ONCE,
  CALLS_PER_CALLER_PER_DAY,
  CLINIC_MINUTES_PER_DAY,
} from "../rules/limits";
import { addDays, atClinicTime, clinicDay, weekdayOf } from "../rules/time";

// The diary and the call ledger against the real Postgres: two bookings for one slot, and two callers
// pressing Call at once for the last line, are decided by the database, not by a read before a write.

const callers = Array.from(
  { length: 12 },
  (_, i) => `00000000-0000-4000-9000-${String(i).padStart(12, "0")}`,
);
const phone = "07700900288";
const friday = (() => {
  for (let day = addDays(clinicDay(new Date()), 1); ; day = addDays(day, 1))
    if (weekdayOf(day) === 5) return day;
})();

async function clear() {
  await db.delete(calls).where(inArray(calls.caller, callers));
  await db.delete(bookings).where(inArray(bookings.phone, [phone]));
}

beforeAll(clear);
afterAll(clear);

describe("the diary", () => {
  test("two callers booking the same slot at once: one gets it", async () => {
    const start = atClinicTime(friday, "16:30");
    const tries = ["Ada", "Ben", "Cy"].map((callerName) =>
      bookSlot({ physioId: "priya", start, callerName, phone, reason: "Test", bookedBy: "phone" }),
    );
    const results = await Promise.all(tries);
    expect(results.filter((one) => "booked" in one)).toHaveLength(1);
  });

  test("a caller with only the phone number finds nothing", async () => {
    const [winner] = await bookingsFor(phone, new Date());
    if (!winner) throw new Error("The booking from the test before is missing.");
    expect(await bookingsOfCaller(phone, "Someone Else", new Date())).toHaveLength(0);
    expect(await bookingsOfCaller(phone, winner.callerName.toLowerCase(), new Date())).toHaveLength(1);
  });

  test("a booking is cancelled only with the phone number it was made with", async () => {
    const [mine] = await bookingsFor(phone, new Date());
    if (!mine) throw new Error("The booking from the test before is missing.");
    expect(await cancelBooking(mine.id, "07700900000")).toBe(false);
    expect(await cancelBooking(mine.id, phone)).toBe(true);
    expect(await bookingsFor(phone, new Date())).toHaveLength(0);
  });
});

describe("the call ledger", () => {
  test("one caller gets their calls for the day, then is refused", async () => {
    const [caller] = callers;
    for (let i = 0; i < CALLS_PER_CALLER_PER_DAY; i++) {
      const placed = await reserveCall(caller as string);
      if (!("id" in placed)) throw new Error(`Call ${i + 1} was refused: ${placed.blocked}`);
      await settleCall(placed.id, { seconds: 1, costUsd: 0, usage: NO_USAGE, because: "test" });
    }
    expect(await reserveCall(caller as string)).toEqual({ blocked: expect.stringContaining("tomorrow") });
  });

  test("callers racing for the last free line: exactly one gets it", async () => {
    const before = await usageToday(callers[1] as string);
    expect(before.secondsToday + (CALLS_AT_ONCE - before.live) * CALL_SECONDS).toBeLessThanOrEqual(
      CLINIC_MINUTES_PER_DAY * 60,
    );
    for (const caller of callers.slice(1, CALLS_AT_ONCE - before.live)) await reserveCall(caller);
    const racers = callers.slice(CALLS_AT_ONCE - before.live, CALLS_AT_ONCE - before.live + 4);
    const results = await Promise.all(racers.map((caller) => reserveCall(caller)));
    expect(results.filter((one) => "id" in one)).toHaveLength(1);
    expect(
      results.filter((one) => "blocked" in one).map((one) => ("blocked" in one ? one.blocked : "")),
    ).toEqual(Array(3).fill(expect.stringContaining("busy")));
  });
});

describe("a call's rows", () => {
  test("removing a call removes its lines and keeps what it booked", async () => {
    // Written straight to the table: the test before has every line busy.
    const [placed] = await db
      .insert(calls)
      .values({ caller: callers[11] as string, status: "ended", seconds: 1, costUsd: 0 })
      .returning();
    if (!placed) throw new Error("The test call was not written.");
    await addLine(placed.id, "caller", "A line from the test.");
    const start = atClinicTime(addDays(friday, 7), "16:30");
    const made = await bookSlot({
      physioId: "priya",
      start,
      callerName: "Ada",
      phone,
      reason: "Test",
      bookedBy: "phone",
      callId: placed.id,
    });
    if (!("booked" in made)) throw new Error("The test booking was refused.");
    await db.delete(calls).where(eq(calls.id, placed.id));
    expect(await linesOf(placed.id)).toHaveLength(0);
    const [kept] = await db.select().from(bookings).where(eq(bookings.id, made.booked.id));
    expect(kept?.callId).toBeNull();
  });
});
