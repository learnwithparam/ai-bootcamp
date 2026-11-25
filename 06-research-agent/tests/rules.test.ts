import { afterAll, expect, test } from "bun:test";
import { END, Send } from "@langchain/langgraph";
import { inArray } from "drizzle-orm";
import { afterIdentify } from "../agent/graph";
import { db, findReport, reportsBy, startReport, updateReport, usage } from "../db/queries";
import { reports } from "../db/schema";
import { cleanUrl, keptClaims, quoteIsOnPage, withoutCitations } from "../rules/claims";
import { companyQuery, whyNotStart } from "../rules/limits";
import { pageText } from "../rules/page-text";
import { isPublicUrl } from "../rules/public-url";
import { backedFacts, type Facts, leadScore } from "../rules/score";
import { TOPICS } from "../rules/topics";

// The plain code, with no model: the quote check, the page reader, the lead score, the address guard,
// the limits, the graph's fan-out, and the queries against a real Postgres.

const made: string[] = [];
afterAll(() => db.delete(reports).where(inArray(reports.createdBy, made)));

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

test("the limits refuse a second running report and a full day", () => {
  expect(whyNotStart(0, 0)).toBeNull();
  expect(whyNotStart(1, 1)).toContain("still running");
  expect(whyNotStart(0, 10)).toContain("today");
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

test("a report is found only by the account that asked for it", async () => {
  const owner = `owner-${crypto.randomUUID()}`;
  const stranger = `stranger-${crypto.randomUUID()}`;
  made.push(owner, stranger);
  const id = await startReport("Linear", owner);
  expect((await findReport(id, owner))?.company).toBe("Linear");
  expect(await findReport(id, stranger)).toBeNull();
  expect(await findReport("not-a-uuid", owner)).toBeNull();
  expect(await reportsBy(stranger)).toEqual([]);
  expect(await usage(owner)).toEqual({ runningNow: 1, startedToday: 1 });
  await updateReport(id, { status: "done" });
  expect(await usage(owner)).toEqual({ runningNow: 0, startedToday: 1 });
});
