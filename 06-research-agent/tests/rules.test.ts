import { afterAll, expect, test } from "bun:test";
import { END, Send } from "@langchain/langgraph";
import { inArray } from "drizzle-orm";
import { afterIdentify } from "../agent/graph";
import {
  db,
  findReport,
  roleOf,
  startReport,
  startWithinLimits,
  takeReport,
  teamReports,
  updateReport,
  usage,
} from "../db/queries";
import { reports } from "../db/schema";
import { cleanUrl, keptClaims, quoteIsOnPage, withoutCitations } from "../rules/claims";
import { companiesFrom, companyQuery, RUNNING_AT_ONCE, whyNotStart } from "../rules/limits";
import { pageText } from "../rules/page-text";
import { isPublicIp, isPublicUrl } from "../rules/public-url";
import { backedFacts, type Facts, leadScore } from "../rules/score";
import { may, ownerOfNew } from "../rules/team";
import { TOPICS } from "../rules/topics";

// The plain code, with no model: the quote check, the page reader, the lead score, the address guard,
// the limits, the graph's fan-out, and the queries against a real Postgres.

const made: string[] = [];
afterAll(async () => {
  await db.delete(reports).where(inArray(reports.createdBy, made));
});

const PAGE = "<p>Linear powers over 50,000 product teams.</p><script>var hidden = 1;</script>";

test("a quote is found on its page despite curly quotes, case and spacing", () => {
  const text = pageText(PAGE);
  expect(text).not.toContain("hidden");
  expect(quoteIsOnPage("LINEAR powers  over 50,000 product teams", text)).toBe(true);
  expect(quoteIsOnPage("Engineer North America Learn more", "Engineer North America Learn more →")).toBe(
    true,
  );
  expect(quoteIsOnPage("“Linear powers over 50,000”", '"Linear powers over 50,000"')).toBe(true);
});

test("a quote that is not on the page, or too short to mean anything, fails", () => {
  const text = pageText(PAGE);
  expect(quoteIsOnPage("Linear powers over 90,000 product teams", text)).toBe(false);
  expect(quoteIsOnPage("Linear", text)).toBe(false);
});

test("only found claims are kept, and tracking is cut from links", () => {
  const base = { id: "a", topic: "ai", text: "t", sourceUrl: "https://x.com", quote: "q" };
  const kept = keptClaims([
    { ...base, check: "found" },
    { ...base, id: "b", check: "missing" },
    { ...base, id: "c", check: "unreadable" },
  ]);
  expect(kept.map((claim) => claim.id)).toEqual(["a"]);
  expect(cleanUrl("https://x.com/a?utm_source=openai&id=2#top")).toBe("https://x.com/a?id=2");
});

test("citations that search adds to the text are taken out", () => {
  const text = "Vercel is a developer platform. ([vercel.com](https://vercel.com/about?utm_source=openai))";
  expect(withoutCitations(text)).toBe("Vercel is a developer platform.");
  expect(withoutCitations("Built by [Vercel](https://vercel.com) in 2015.")).toBe("Built by Vercel in 2015.");
});

test("only public web addresses may be opened", () => {
  for (const url of ["https://linear.app/careers", "http://93.184.216.34/"])
    expect(isPublicUrl(url)).toBe(true);
  const refused = [
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://10.0.0.5",
    "http://192.168.1.1",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "file:///etc/passwd",
    "http://db.internal",
    "not a url",
  ];
  for (const url of refused) expect(isPublicUrl(url)).toBe(false);
  for (const ip of ["8.8.8.8", "2606:4700::1111"]) expect(isPublicIp(ip)).toBe(true);
  const privateIps = [
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "100.64.0.1",
    "0.0.0.0",
    "::",
    "fe80::1",
    "fd00::1",
    "224.0.0.1",
  ];
  for (const ip of privateIps) expect(isPublicIp(ip)).toBe(false);
});

const FACTS: Facts = {
  employees: { value: 300, claimIds: ["size-1"] },
  lastRoundMonth: { value: "2025-09", claimIds: ["size-2"] },
  hiringEngineers: { value: true, claimIds: ["hiring-1"] },
  buildsWithAI: { value: true, claimIds: ["ai-1"] },
};

test("a company that fits on all four counts scores 100", () => {
  expect(leadScore(FACTS, "2026-11-25")).toMatchObject({ total: 100, fit: "strong" });
});

test("a fact whose claim failed its check counts as unknown", () => {
  const backed = backedFacts(FACTS, new Set(["size-1", "hiring-1"]));
  expect(backed.lastRoundMonth.value).toBeNull();
  expect(backed.buildsWithAI.value).toBeNull();
  expect(leadScore(backed, "2026-11-25")).toMatchObject({ total: 55, fit: "possible" });
});

test("an old round and a tiny team score low", () => {
  const facts = { ...FACTS, employees: { value: 4, claimIds: ["size-1"] } };
  const old = { ...facts, lastRoundMonth: { value: "2021-01", claimIds: ["size-2"] } };
  expect(leadScore(old, "2026-11-25").total).toBe(50);
});

test("the limits refuse a paste that is too long, too many running, and a full day", () => {
  expect(whyNotStart(0, 0, RUNNING_AT_ONCE)).toBeNull();
  expect(whyNotStart(0, 0, RUNNING_AT_ONCE + 1)).toBe(`Add up to ${RUNNING_AT_ONCE} accounts at a time.`);
  expect(whyNotStart(4, 4, 2)).toContain("You can add 1 more now");
  expect(whyNotStart(0, 14, 2)).toContain("1 are left today");
  expect(companiesFrom("Linear\n\nposthog.com, linear ,x")).toEqual(["Linear", "posthog.com"]);
  expect(companyQuery("  Linear   app ")).toBe("Linear app");
  expect(companyQuery("x")).toBeNull();
});

test("one researcher starts per topic, and none when no company was found", () => {
  const identity = { name: "Linear", website: "https://linear.app", oneLine: "Issue tracking." };
  const sends = afterIdentify({ identity });
  expect(Array.isArray(sends) && sends.every((send) => send instanceof Send)).toBe(true);
  expect((sends as Send[]).length).toBe(TOPICS.length);
  expect(afterIdentify({ identity: null })).toBe(END);
});

test("a rep takes only an account nobody owns, and only the lead assigns", () => {
  expect(may("rep", "take", { ownerId: null })).toBe(true);
  expect(may("rep", "take", { ownerId: "someone" })).toBe(false);
  expect(may("rep", "assign")).toBe(false);
  expect(may("lead", "assign")).toBe(true);
  expect(ownerOfNew("rep", "me")).toBe("me");
  expect(ownerOfNew("lead", "me")).toBeNull();
});

test("signing up alone does not put someone on the team", async () => {
  expect(await roleOf(`stranger-${crypto.randomUUID()}`)).toBeNull();
});

test("the whole team sees every account, and two reps cannot both take one", async () => {
  const lead = `lead-${crypto.randomUUID()}`;
  const [ana, ben] = [`ana-${crypto.randomUUID()}`, `ben-${crypto.randomUUID()}`];
  made.push(lead);
  const id = await startReport("Linear", lead);
  expect((await findReport(id))?.company).toBe("Linear");
  expect(await findReport("not-a-uuid")).toBeNull();
  expect((await teamReports("unassigned", ana)).some((report) => report.id === id)).toBe(true);
  const both = await Promise.all([takeReport(id, ana), takeReport(id, ben)]);
  expect(both.filter(Boolean)).toHaveLength(1);
  const owner = (await findReport(id))?.ownerId;
  expect((await teamReports("mine", owner ?? "")).map((report) => report.id)).toContain(id);
  expect(await usage(lead)).toEqual({ runningNow: 1, startedToday: 1 });
  await updateReport(id, { status: "done" });
  expect(await usage(lead)).toEqual({ runningNow: 0, startedToday: 1 });
});

test("two pastes at the same moment cannot both pass the running limit", async () => {
  const owner = `racer-${crypto.randomUUID()}`;
  made.push(owner);
  const paste = ["Linear", "Vercel", "Supabase"];
  const both = await Promise.all([
    startWithinLimits(paste, owner, owner),
    startWithinLimits(paste, owner, owner),
  ]);
  expect(both.filter((one) => one.ids?.length === 3).length).toBe(1);
  expect(both.filter((one) => one.refused).length).toBe(1);
});
