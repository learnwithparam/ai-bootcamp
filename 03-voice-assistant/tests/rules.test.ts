import { describe, expect, test } from "bun:test";
import { callCost } from "../rules/cost";
import { type Hold, phoneDigits, readBack, whyNotConfirm, whyNotPhone } from "../rules/hold";
import { sameCaller } from "../rules/identity";
import {
  CALL_CEILING_USD,
  CALL_SECONDS,
  CALLS_AT_ONCE,
  CALLS_PER_CALLER_PER_DAY,
  CLINIC_MINUTES_PER_DAY,
  limitMessage,
} from "../rules/limits";
import { nearest, offerSentence, openings } from "../rules/offer";
import { freeSlots, startsOn, whyNotDay, whyNotStart } from "../rules/slots";
import { atClinicTime, clinicClock, clinicDay, spokenTime } from "../rules/time";

// The rules the phone cannot talk its way past: the hours, the diary, the read back, and the limits.

const physios = [
  { id: "maya", name: "Maya Okafor", focus: "sports injuries" },
  { id: "tom", name: "Tom Lindqvist", focus: "back and neck pain" },
];
// A Monday morning in winter and one in summer, so clinic time is checked on both sides of the clock change.
const monday = "2026-12-07";
const now = atClinicTime("2026-12-07", "07:00");

describe("clinic time", () => {
  test("a clinic time is London time in winter and in summer", () => {
    expect(atClinicTime("2026-12-07", "10:00").toISOString()).toBe("2026-12-07T10:00:00.000Z");
    expect(atClinicTime("2026-07-06", "10:00").toISOString()).toBe("2026-07-06T09:00:00.000Z");
    expect(clinicClock(atClinicTime("2026-07-06", "10:00"))).toBe("10:00");
    expect(clinicDay(new Date("2026-07-06T23:30:00Z"))).toBe("2026-07-07");
  });

  test("times are said the way people say them", () => {
    expect(spokenTime("10:00")).toBe("10am");
    expect(spokenTime("14:30")).toBe("2:30pm");
  });
});

describe("the hours and the diary", () => {
  test("Sunday is closed, a past day has gone, and the phone books four weeks ahead", () => {
    expect(whyNotDay("2026-12-13", now)).toBe("We are closed on Sundays.");
    expect(whyNotDay("2026-12-06", now)).toBe("That day has already gone.");
    expect(whyNotDay("2027-01-30", now)).toContain("leave a message");
    expect(whyNotDay(monday, now)).toBeNull();
  });

  test("appointments start on the half hour and the last ends by closing", () => {
    const starts = startsOn(monday);
    expect(starts[0]).toBe("08:00");
    expect(starts.at(-1)).toBe("17:30");
    expect(startsOn("2026-12-12")).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
    ]);
    expect(whyNotStart(monday, "10:15", now)).toContain("every 30 minutes");
    expect(whyNotStart(monday, "18:00", now)).not.toBeNull();
  });

  test("a taken slot is not offered, and a time already gone is not offered", () => {
    const taken = [{ physioId: "maya", start: atClinicTime(monday, "10:00") }];
    const free = freeSlots(monday, physios, taken, atClinicTime(monday, "09:10"));
    expect(free[0]?.clock).toBe("09:30");
    expect(free.filter((slot) => slot.clock === "10:00").map((slot) => slot.physioId)).toEqual(["tom"]);
  });
});

describe("what the phone offers", () => {
  const free = freeSlots(monday, physios, [], now);

  test("the asked-for time when it is free", () => {
    expect(offerSentence(free, "10:00")).toBe("10am with Maya Okafor or Tom Lindqvist is free.");
  });

  test("the nearest times when it is not, never the whole day", () => {
    const busy = free.filter((slot) => slot.clock !== "10:00");
    expect(nearest(openings(busy), "10:00").map((one) => one.clock)).toEqual([
      "09:00",
      "09:30",
      "10:30",
      "11:00",
    ]);
    expect(offerSentence(busy, "10:00")).toStartWith("10am is not free.");
  });
});

describe("booking needs a read back and a yes", () => {
  const hold: Hold = {
    physioId: "maya",
    physio: "Maya Okafor",
    day: monday,
    clock: "10:00",
    start: atClinicTime(monday, "10:00"),
    callerName: "Daniel Price",
    phone: "07700900215",
    reason: "Knee",
    callerTurns: 3,
    at: now,
  };

  test("nothing held, no answer since the read back, or a hold run out, all refuse", () => {
    expect(whyNotConfirm(undefined, 4, now)).toContain("Nothing is held");
    expect(whyNotConfirm(hold, 3, now)).toContain("wait for them to say yes");
    expect(whyNotConfirm(hold, 4, new Date(now.getTime() + 6 * 60_000))).toContain("ran out");
    expect(whyNotConfirm(hold, 4, now)).toBeNull();
  });

  test("the read back says every detail, and the phone number is checked", () => {
    expect(readBack(hold)).toBe(
      "Monday 7 December at 10am with Maya Okafor, for Daniel Price, phone 07700 900215.",
    );
    expect(phoneDigits("+44 7700 900215")).toBe("07700900215");
    expect(phoneDigits("07700. 900. 215")).toBe("07700900215");
    expect(whyNotPhone("07700 900")).toContain("only 8 digits");
    expect(whyNotPhone("call me")).toContain("not a UK phone number");
    expect(phoneDigits("07700 900")).toBeNull();
    expect(phoneDigits("seven")).toBeNull();
  });
});

describe("the limits", () => {
  const fresh = { live: 0, secondsToday: 0, callerCallsToday: 0 };

  test("each limit refuses on its own", () => {
    expect(limitMessage(fresh)).toBeNull();
    expect(limitMessage({ ...fresh, callerCallsToday: CALLS_PER_CALLER_PER_DAY })).toContain("tomorrow");
    expect(
      limitMessage({ ...fresh, secondsToday: CLINIC_MINUTES_PER_DAY * 60 - CALL_SECONDS + 1 }),
    ).toContain("closed for today");
    expect(limitMessage({ ...fresh, live: CALLS_AT_ONCE })).toContain("busy");
  });

  test("a five minute call costs a few cents, under the ceiling", () => {
    const usage = {
      heardSeconds: 150,
      spokenCharacters: 2500,
      promptTokens: 40_000,
      cachedTokens: 20_000,
      completionTokens: 1_000,
    };
    const cost = callCost(usage, CALL_SECONDS);
    // Heard, spoken, the model (half its input cached), and the line cleaned for five minutes.
    expect(cost).toBeCloseTo(0.01875 + 0.0375 + (8_000 + 4_000 + 1_200) / 1e6 + 0.006, 6);
    expect(cost).toBeLessThan(CALL_CEILING_USD);
  });
});

describe("who may hear or cancel an appointment", () => {
  test("the family name must match the one it was booked under", () => {
    expect(sameCaller("Ruth Ellis", "Ruth Ellis")).toBe(true);
    expect(sameCaller("Ruth Ellis", "ellis")).toBe(true);
    expect(sameCaller("Mary-Jane O'Neil", "Mary Jane O'Neil.")).toBe(true);
    expect(sameCaller("Ruth Ellis", "Ruth Ellison")).toBe(false);
    expect(sameCaller("Ruth Ellis", "Ruth")).toBe(false);
    expect(sameCaller("Ruth Ellis", "")).toBe(false);
  });
});
