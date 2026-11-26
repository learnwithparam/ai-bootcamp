import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { findProduct } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { and, eq, gt } from "drizzle-orm";
import { type Browser, chromium, type Page } from "playwright";
import { db } from "../db/queries";
import { reports } from "../db/schema";

// The team's path in a real browser, as the seeded sales team. Grace, a rep, adds a company and watches its
// cells fill in as each researcher returns. Priya, the lead, gives the account to Tomás. The model and the
// web are real, so this runs in `bun run proof`. The test removes its account after, so the seed stays as it was.

const URL = `http://localhost:${findProduct("research-agent").port}`;
const COMPANY = "Raycast";
const started = new Date();
let server: ChildProcess | undefined;
let browser: Browser;

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(2_000) }).catch(
    () => undefined,
  );
  return response?.ok ?? false;
}

// Uses the server you already run with `bun run dev research-agent`, or starts one for this test.
async function startServer() {
  if (await isUp()) return;
  // Its own process group, so stopping it also stops the Next.js server it starts.
  server = spawn("bun", ["scripts/dev.ts", "research-agent"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp()) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`The research agent did not start on ${URL}.`);
}

beforeAll(async () => {
  await startServer();
  browser = await chromium.launch();
}, 90_000);

afterAll(async () => {
  await browser?.close();
  await db.delete(reports).where(and(eq(reports.company, COMPANY), gt(reports.createdAt, started)));
  // Only a server this test started and that is still running.
  if (server?.pid && server.exitCode === null) process.kill(-server.pid);
});

async function signIn(who: "priya" | "grace" | "tomas"): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/sign-in`);
  await page.getByLabel("Email").fill(`${who}@research-seed.learnwithparam.test`);
  await page.getByLabel("Password").fill("seeded research password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/accounts/);
  return page;
}

// The table row whose company cell names the account this test added.
const rowOf = (page: Page) =>
  page.locator("tr", { has: page.getByRole("rowheader", { name: new RegExp(COMPANY) }) });

async function repAddsAnAccount(rep: Page) {
  await rep.getByLabel(/Add accounts/).fill(COMPANY);
  await rep.getByRole("button", { name: "Research" }).click();
  await rep.getByText("Researching 1 new account.").waitFor({ timeout: 30_000 });
  const row = rowOf(rep);
  await row.getByText("Researching").first().waitFor();
  // The page reloads itself while the researchers run. The score lands last.
  await row.locator(".score-cell strong").waitFor({ timeout: 180_000 });
  expect(await row.getByText("You", { exact: true }).count()).toBe(1);
  expect(await rep.locator(".owner-select").count()).toBe(0);
  return row;
}

async function repReadsTheSources(rep: Page, row: ReturnType<typeof rowOf>) {
  await row
    .getByRole("button", { name: /sources? for/ })
    .first()
    .click();
  const sources = rep.getByRole("dialog", { name: /sources/ });
  await sources.waitFor();
  await expect(sources.locator("a[target=_blank]").count()).resolves.toBeGreaterThanOrEqual(1);
  await checkPage(rep);
  await rep.keyboard.press("Escape");
}

async function leadAssigns() {
  const lead = await signIn("priya");
  const owner = lead.getByLabel(new RegExp(`Owner of ${COMPANY}`));
  await owner.selectOption({ label: "Tomás Ortega" });
  // Picking a name saves it at once. A reload shows what the server kept.
  for (let attempt = 0; attempt < 20; attempt++) {
    await lead.reload();
    if ((await owner.locator("option:checked").textContent()) === "Tomás Ortega") break;
    await Bun.sleep(500);
  }
  const tomas = await signIn("tomas");
  await tomas.goto(`${URL}/accounts?view=mine`);
  await tomas
    .getByRole("row", { name: new RegExp(COMPANY) })
    .getByText("You", { exact: true })
    .waitFor();
  await checkPage(lead);
}

test("a rep adds an account and reads its sources, and the lead gives it to another rep", async () => {
  const rep = await signIn("grace");
  const row = await repAddsAnAccount(rep);
  await repReadsTheSources(rep, row);
  await leadAssigns();
}, 300_000);
