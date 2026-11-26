import { afterAll, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { runResearch } from "../agent/agent";
import { readPage } from "../agent/read-page";
import { db, findReport, startReport } from "../db/queries";
import { reports } from "../db/schema";
import { keptClaims, quoteIsOnPage } from "../rules/claims";

// The real graph, the real model and the live web, saved to a real Postgres. Runs in `bun run proof`.
// The metric on the learner page: every kept claim's quote is on its page, read again here, apart from the agent.

const made: string[] = [];
afterAll(async () => {
  await db.delete(reports).where(inArray(reports.createdBy, made));
});

async function research(company: string) {
  const owner = `proof-${crypto.randomUUID()}`;
  made.push(owner);
  const id = await startReport(company, owner);
  await runResearch(id, company, "2026-11-25");
  const report = await findReport(id);
  if (!report) throw new Error("The report row is gone.");
  return report;
}

test("a real company gets a scored report, and every kept claim is on its page", async () => {
  const report = await research("vercel.com");
  expect(report.status).toBe("done");
  expect(report.identity?.website).toContain("vercel.com");
  const kept = keptClaims(report.claims);
  expect(kept.length).toBeGreaterThanOrEqual(6);
  expect(new Set(kept.map((claim) => claim.topic)).size).toBeGreaterThanOrEqual(3);
  for (const claim of kept) {
    const page = await readPage(claim.sourceUrl);
    expect(page !== null && quoteIsOnPage(claim.quote, page)).toBe(true);
  }
  const keptIds = new Set(kept.map((claim) => claim.id));
  for (const reason of report.score?.reasons ?? []) {
    for (const id of reason.claimIds) expect(keptIds.has(id)).toBe(true);
  }
  expect(report.score?.total).toBeGreaterThanOrEqual(0);
  expect(report.score?.total).toBeLessThanOrEqual(100);
  expect(report.cost).toBeGreaterThan(0);
  expect(report.cost).toBeLessThan(0.25);
  console.log(`${kept.length} of ${report.claims.length} claims kept, cost $${report.cost.toFixed(3)}`);
}, 180_000);

test("a company that does not exist fails with a clear message and no claims", async () => {
  const report = await research("Qzxvbnmplk Widgets Zebrafjord");
  expect(report.status).toBe("failed");
  expect(report.error).toContain("No company called");
  expect(report.claims).toEqual([]);
}, 120_000);
