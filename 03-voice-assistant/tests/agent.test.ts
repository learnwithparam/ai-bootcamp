import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, inArray } from "drizzle-orm";
import { bookSlot } from "../db/diary";
import { db, findCall, linesOf } from "../db/queries";
import { bookings } from "../db/schema";
import { CALL_CEILING_USD } from "../rules/limits";
import { slotOf } from "../rules/slots";
import { addDays, atClinicTime, clinicDay, weekdayOf } from "../rules/time";
import { removeCallers } from "./accounts";
import { type Caller, placeCall } from "./caller";

// The proof: real phone calls. A bot caller speaks recorded lines into a LiveKit room, the real worker answers
// with the real speech models and the real MODEL, and every claim is read back from Postgres:
// what was booked, what was refused, what was cancelled, and what each call cost.

const CALLERS = ["book", "taken", "sunday", "cancel"].map((name, i) => ({
  name,
  id: `00000000-0000-4000-8000-00000000000${i}`,
}));
const PHONES = { book: "07700900215", cancel: "07700900216", taken: "07700900217", fill: "07700900299" };
const tuesday = (() => {
  for (let day = addDays(clinicDay(new Date()), 1); ; day = addDays(day, 1))
    if (weekdayOf(day) === 2) return day;
})();
let worker: ReturnType<typeof Bun.spawn>;

async function settled(callId: string) {
  for (let i = 0; i < 60; i++) {
    const call = await findCall(callId);
    if (call?.status === "ended") return call;
    await Bun.sleep(500);
  }
  throw new Error("The call never settled.");
}

// One call, line by line. If the agent has not hung up a few seconds after the last line, the caller does.
async function call(name: string, lines: string[]) {
  const caller: Caller = await placeCall(CALLERS.find((one) => one.name === name)?.id as string);
  for (const line of lines) await caller.say(line);
  await Promise.race([caller.ended, Bun.sleep(8000)]);
  await caller.hangUp();
  const ended = await settled(caller.callId);
  expect(ended.costUsd).toBeGreaterThan(0);
  expect(ended.costUsd).toBeLessThan(CALL_CEILING_USD);
  const said = await linesOf(caller.callId);
  console.log(
    `${name}: ${ended.seconds}s, $${ended.costUsd.toFixed(4)}\n${said.map((one) => `  ${one.role}: ${one.text}`).join("\n")}`,
  );
  return { callId: caller.callId, said };
}

// The worker logs "registered worker" once LiveKit will send it calls. The stream is read to the end,
// so a full pipe never stalls the worker.
function registered(stream: ReadableStream<Uint8Array>): Promise<void> {
  return new Promise((resolve) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const read = (): Promise<void> =>
      reader.read().then(({ done, value }) => {
        if (done) return;
        if (decoder.decode(value).includes("registered worker")) resolve();
        return read();
      });
    read().catch((error) => console.error("The worker's log could not be read:", error));
  });
}

// The test's calls and bookings, removed before a run and after it, so a learner's diary never keeps them.
async function removeTestRows() {
  await removeCallers(CALLERS.map((one) => one.id));
  await db.delete(bookings).where(inArray(bookings.phone, Object.values(PHONES)));
}

beforeAll(async () => {
  await removeTestRows();
  worker = Bun.spawn(["bun", "agent/worker.ts", "dev"], {
    cwd: `${import.meta.dir}/..`,
    stdout: "pipe",
    stderr: "pipe",
  });
  await Promise.race([
    registered(worker.stdout as ReadableStream<Uint8Array>),
    registered(worker.stderr as ReadableStream<Uint8Array>),
  ]);
}, 60_000);

// A worker left running would answer the next run's calls with a fresh memory, so the test waits for it to go.
afterAll(async () => {
  worker?.kill();
  const gone = await Promise.race([worker?.exited.then(() => true), Bun.sleep(15_000).then(() => false)]);
  if (!gone) worker?.kill("SIGKILL");
  await removeTestRows();
}, 20_000);

describe("real phone calls that book", () => {
  test("a caller books Tuesday at ten, read back and confirmed", async () => {
    const { callId, said } = await call("book", ["book-1", "book-2", "book-3", "yes", "bye"]);
    const [booked] = await db.select().from(bookings).where(eq(bookings.callId, callId));
    expect(booked?.phone).toBe(PHONES.book);
    expect(slotOf(booked?.start as Date)).toEqual({ day: tuesday, clock: "10:00" });
    const tools = said.filter((line) => line.role === "tool").map((line) => line.text);
    expect(tools.findIndex((text) => text.startsWith("Held"))).toBeLessThan(
      tools.findIndex((text) => text.startsWith("Booked")),
    );
  }, 240_000);

  test("ten o'clock is full, so the caller gets another time and no slot is booked twice", async () => {
    const ten = atClinicTime(tuesday, "10:00");
    for (const physioId of ["maya", "tom", "priya"]) {
      await bookSlot({
        physioId,
        start: ten,
        callerName: "Fill",
        phone: PHONES.fill,
        reason: "Held for the test",
        bookedBy: "front desk",
      });
    }
    const { callId } = await call("taken", ["taken-1", "taken-2", "taken-3", "yes", "bye"]);
    const [booked] = await db.select().from(bookings).where(eq(bookings.callId, callId));
    expect(booked?.phone).toBe(PHONES.taken);
    expect(slotOf(booked?.start as Date)).toEqual({ day: tuesday, clock: "11:00" });
    const atTen = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.start, ten), eq(bookings.status, "booked")));
    expect(atTen).toHaveLength(3);
  }, 240_000);
});

describe("real phone calls that book nothing new", () => {
  test("Sunday is refused, and nothing is booked", async () => {
    const { callId, said } = await call("sunday", ["sunday-1", "sunday-2", "bye"]);
    expect(await db.select().from(bookings).where(eq(bookings.callId, callId))).toHaveLength(0);
    const agent = said.filter((line) => line.role === "agent").map((line) => line.text.toLowerCase());
    expect(agent.some((text) => text.includes("closed"))).toBe(true);
  }, 240_000);

  test("a caller cancels, found by their name and phone number", async () => {
    const wednesday = addDays(tuesday, 1);
    const made = await bookSlot({
      physioId: "tom",
      start: atClinicTime(wednesday, "15:00"),
      callerName: "Ruth Ellis",
      phone: PHONES.cancel,
      reason: "Neck",
      bookedBy: "front desk",
    });
    if (!("booked" in made)) throw new Error("The test appointment could not be made.");
    await call("cancel", ["cancel-1", "cancel-2", "cancel-3", "bye"]);
    const [after] = await db.select().from(bookings).where(eq(bookings.id, made.booked.id));
    expect(after?.status).toBe("cancelled");
  }, 240_000);
});
