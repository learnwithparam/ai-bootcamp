import { describe, expect, test } from "bun:test";
import { byDeadline, canDecide, deadlineOf, stepStates, tabFor, urgency } from "../rules/board";
import {
  EMPTY_DRAFT,
  grounded,
  merge,
  missing,
  readDraft,
  readTurnsPerVisitor,
  TURNS_MAX,
  tidyDraft,
  tidyEdited,
  whyNotTalk,
} from "../rules/collect";
import type { Intake, Turn } from "../rules/intake";

// The intake conversation's rules and the board's rules. No model, no database.

const WORDS =
  "I am Ana Silva, ana@silva.pt. My landlord Greenway Homes kept my deposit of 900 pounds. " +
  "They say I must leave by 15 January 2027 or they will go to court.";
const TRANSCRIPT: Turn[] = [
  { from: "agent", text: "Tell me what happened." },
  { from: "client", text: WORDS },
];

describe("filling the form from the conversation", () => {
  test("a name, email or party the client never typed is dropped", () => {
    const kept = grounded(
      {
        clientName: "Maria Costa",
        clientEmail: "maria@costa.pt",
        otherParties: ["Greenway Homes", "Acme Bank"],
        keyDate: { date: "2027-01-15", quote: "leave by 15 January 2027" },
        goal: "Get the deposit back",
      },
      WORDS,
    );
    expect(kept.clientName).toBeUndefined();
    expect(kept.clientEmail).toBeUndefined();
    expect(kept.otherParties).toEqual(["Greenway Homes"]);
    expect(kept.keyDate?.date).toBe("2027-01-15");
    expect(grounded({ clientName: "Ana Silva", clientEmail: "ANA@silva.pt" }, WORDS)).toEqual({
      clientName: "Ana Silva",
      clientEmail: "ana@silva.pt",
    });
  });

  test("a date with no quote from the client is dropped", () => {
    expect(
      grounded({ keyDate: { date: "2027-01-15", quote: "next spring" } }, WORDS).keyDate,
    ).toBeUndefined();
  });

  test("the agent never writes over a field the client changed", () => {
    const draft = { ...EMPTY_DRAFT, clientName: "Ana S." };
    const next = merge(draft, { clientName: "Ana Silva", goal: "Deposit back" }, ["clientName"]);
    expect(next.clientName).toBe("Ana S.");
    expect(next.goal).toBe("Deposit back");
  });
});

describe("checking what the page sends", () => {
  test("what the page sends is tidied, never trusted", () => {
    const draft = tidyDraft({
      clientName: 7,
      otherParties: ["A", "", 3],
      keyDate: { date: "soon" },
      goal: "x".repeat(900),
    });
    expect(draft.clientName).toBe("");
    expect(draft.otherParties).toEqual(["A"]);
    expect(draft.keyDate).toBeNull();
    expect(draft.goal).toHaveLength(300);
    expect(tidyEdited(["goal", "admin"])).toEqual(["goal"]);
  });
});

describe("before and after the conversation", () => {
  test("limits are checked before any model call", () => {
    const full = Array.from({ length: TURNS_MAX }, () => ({ from: "client" as const, text: "more" }));
    expect(whyNotTalk("hi", TRANSCRIPT, { visitorToday: 0, today: 0, perVisitor: 60 })).toBeNull();
    expect(whyNotTalk(" ", TRANSCRIPT, { visitorToday: 0, today: 0, perVisitor: 60 })).toContain("Type");
    expect(whyNotTalk("x".repeat(2000), TRANSCRIPT, { visitorToday: 0, today: 0, perVisitor: 60 })).toContain(
      "under",
    );
    expect(whyNotTalk("hi", full, { visitorToday: 0, today: 0, perVisitor: 60 })).toContain("Check the form");
    expect(whyNotTalk("hi", TRANSCRIPT, { visitorToday: 60, today: 0, perVisitor: 60 })).toContain(
      "tomorrow",
    );
    expect(whyNotTalk("hi", TRANSCRIPT, { visitorToday: 0, today: 3000, perVisitor: 60 })).toContain(
      "tomorrow",
    );
    expect(whyNotTalk("hi", TRANSCRIPT, { visitorToday: 60, today: 0, perVisitor: 300 })).toBeNull();
  });

  test("the form is checked again when sent, and the story is the client's words only", () => {
    expect(missing(EMPTY_DRAFT)).toEqual(["clientName", "clientEmail", "otherParties", "goal"]);
    const draft = {
      ...EMPTY_DRAFT,
      clientName: "Ana Silva",
      clientEmail: "ANA@silva.pt",
      otherParties: ["Greenway Homes"],
      goal: "Deposit back",
    };
    const { request } = readDraft(draft, TRANSCRIPT);
    expect(request?.clientEmail).toBe("ana@silva.pt");
    expect(request?.story).toBe(WORDS);
    expect(readDraft({ ...draft, clientEmail: "nope" }, TRANSCRIPT).error).toContain("email");
    expect(readDraft(draft, [{ from: "client", text: "help" }]).error).toContain("more");
  });
});

const intake = (keyDate: string | null, assessed: string | null, created: string) =>
  ({
    keyDate: keyDate ? { date: keyDate, quote: "" } : null,
    assessment: assessed ? { deadline: { date: assessed, quote: "q" } } : null,
    createdAt: new Date(created),
  }) as unknown as Intake;

describe("the intake board", () => {
  const today = new Date("2026-11-25T10:00:00Z");

  test("only a lawyer decides or approves", () => {
    expect(canDecide("lawyer")).toBe(true);
    expect(canDecide("paralegal")).toBe(false);
  });

  test("the client's date wins, and the closest deadline comes first", () => {
    expect(deadlineOf(intake("2026-12-01", "2027-03-01", "2026-11-01"))?.date).toBe("2026-12-01");
    const rows = [
      intake(null, null, "2026-11-24"),
      intake(null, "2027-01-10", "2026-11-20"),
      intake("2026-11-27", null, "2026-11-10"),
    ];
    expect(rows.sort(byDeadline(today)).map((row) => deadlineOf(row)?.date ?? "none")).toEqual([
      "2026-11-27",
      "2027-01-10",
      "none",
    ]);
    expect(urgency("2026-11-20", today)).toBe("overdue");
    expect(urgency("2026-12-01", today)).toBe("this week");
    expect(urgency("2026-12-20", today)).toBe("later");
  });

  test("an unknown tab falls back to Open", () => {
    expect(tabFor("drop table").key).toBe("open");
    expect(tabFor("decide").statuses).toEqual(["needs review"]);
  });

  test("the workflow drawing shows where a request waits, and where it failed", () => {
    expect(stepStates("needs review", false, true)).toEqual(["done", "done", "now", "later", "later"]);
    expect(stepStates("answered", true, true)).toEqual(["done", "done", "done", "done", "done"]);
    expect(stepStates("failed", true, true)[3]).toBe("now");
    expect(stepStates("failed", false, false)[0]).toBe("now");
  });
});

test("the limit per visitor comes from the settings, and a missing one is an error", () => {
  expect(readTurnsPerVisitor({ LEGAL_INTAKE_TURNS_PER_VISITOR: "60" })).toBe(60);
  expect(() => readTurnsPerVisitor({})).toThrow("LEGAL_INTAKE_TURNS_PER_VISITOR");
  expect(() => readTurnsPerVisitor({ LEGAL_INTAKE_TURNS_PER_VISITOR: "0" })).toThrow();
  expect(() => readTurnsPerVisitor({ LEGAL_INTAKE_TURNS_PER_VISITOR: "lots" })).toThrow();
});
