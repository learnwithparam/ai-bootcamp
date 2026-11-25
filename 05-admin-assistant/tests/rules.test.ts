import { afterAll, expect, test } from "bun:test";
import type { Item } from "@bootcamp/catalog";
import { SKILLS } from "../agent/skills/skills";
import { accountByEmail, addToTeam, roleOf, signupsByDay } from "../db/queries";
import { couponProblem, describeCoupon, MAX_PERCENT_OFF } from "../rules/coupon";
import { everyDay, todayUtc } from "../rules/days";
import { parseSkill } from "../rules/skill-file";
import { whatsNew } from "../rules/whats-new";
import { makeAccount, removeAccounts } from "./accounts";

// The plain code, with no model: reading skills, the coupon limits, the chart's days, the newsletter's items,
// and the queries against a real Postgres.

const made: string[] = [];
afterAll(() => removeAccounts(made));

test("a SKILL.md header gives the name, description and tools", () => {
  const skill = parseSkill(
    "---\nname: demo\ndescription: Does a thing.\nallowed-tools: one, two\n---\n\nDo it well.\n",
  );
  expect(skill).toEqual({
    name: "demo",
    description: "Does a thing.",
    allowedTools: ["one", "two"],
    instructions: "Do it well.",
  });
});

test("a SKILL.md with no header, or no description, is refused", () => {
  expect(() => parseSkill("Just instructions")).toThrow("header");
  expect(() => parseSkill("---\nname: demo\n---\nBody")).toThrow("description");
});

test("every skill in the folder reads, and the names are different", () => {
  expect(SKILLS.map((skill) => skill.name).sort()).toEqual(["coupons", "newsletter", "reports"]);
  for (const skill of SKILLS) expect(skill.instructions.length).toBeGreaterThan(100);
});

test("a coupon inside the limits passes", () => {
  expect(couponProblem({ code: "SPRING20", percentOff: 20, duration: "once" })).toBeNull();
  expect(
    couponProblem({ code: "TEAM50", percentOff: MAX_PERCENT_OFF, duration: "repeating", months: 12 }),
  ).toBeNull();
});

test("a coupon outside the limits names its problem", () => {
  expect(couponProblem({ code: "HUGE90", percentOff: 90, duration: "once" })).toContain("50%");
  expect(couponProblem({ code: "ALWAYS10", percentOff: 10, duration: "forever" })).toContain("never ends");
  expect(couponProblem({ code: "LONG10", percentOff: 10, duration: "repeating", months: 24 })).toContain(
    "12 months",
  );
  expect(couponProblem({ code: "LONG10", percentOff: 10, duration: "repeating" })).toContain("12 months");
  expect(couponProblem({ code: "spring", percentOff: 10, duration: "once" })).toContain("capital");
  expect(couponProblem({ code: "HALF", percentOff: 12.5, duration: "once" })).toContain("whole");
});

test("a coupon reads the same on the card and in the reply", () => {
  expect(describeCoupon({ code: "SPRING20", percentOff: 20, duration: "once" })).toBe(
    "20% off on the first payment, with the code SPRING20",
  );
  expect(describeCoupon({ code: "TEAM10", percentOff: 10, duration: "repeating", months: 1 })).toBe(
    "10% off for 1 month, with the code TEAM10",
  );
});

test("days with no signup are filled with 0, oldest first, ending today", () => {
  const days = everyDay([{ day: "2026-11-24", signups: 3 }], 3, "2026-11-25");
  expect(days).toEqual([
    { day: "2026-11-23", signups: 0 },
    { day: "2026-11-24", signups: 3 },
    { day: "2026-11-25", signups: 0 },
  ]);
  expect(everyDay([], 3, "2026-03-01").map((day) => day.day)).toEqual([
    "2026-02-27",
    "2026-02-28",
    "2026-03-01",
  ]);
});

const item = (kind: Item["kind"], title: string, date: string | null): Item => ({
  kind,
  title,
  url: `https://www.learnwithparam.com/${title}`,
  date,
  duration: null,
  summary: "",
});

test("the newsletter gets upcoming labs, labs since the last issue, and the first posts", () => {
  const items = [
    item("upcoming", "next", "2026-12-02"),
    item("upcoming", "gone", "2026-11-01"),
    item("lab", "recent", "2026-11-20"),
    item("lab", "old", "2026-10-01"),
    item("post", "first", null),
    item("post", "second", null),
    item("course", "course", null),
  ];
  const found = whatsNew(items, "2026-11-18", "2026-11-25", 1);
  expect(found.upcoming.map((each) => each.title)).toEqual(["next"]);
  expect(found.ranRecently.map((each) => each.title)).toEqual(["recent"]);
  expect(found.posts.map((each) => each.title)).toEqual(["first"]);
});

test("a new account is counted on today's bar", async () => {
  const before = await signupsByDay(1);
  const account = await makeAccount("Signup Counter");
  made.push(account.id);
  const after = await signupsByDay(1);
  const today = (rows: typeof after) => rows.find((row) => row.day === todayUtc())?.signups ?? 0;
  expect(today(after)).toBe(today(before) + 1);
});

test("an account is on the team only after the team script adds it, and its role can change", async () => {
  const account = await makeAccount("Owner To Be");
  made.push(account.id);
  expect(await roleOf(account.id)).toBeNull();
  const found = await accountByEmail(account.email.toUpperCase());
  expect(found?.id).toBe(account.id);
  await addToTeam(account.id, "staff");
  expect(await roleOf(account.id)).toBe("staff");
  await addToTeam(account.id, "owner");
  expect(await roleOf(account.id)).toBe("owner");
});
