import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { findProduct } from "@bootcamp/products";
import { eq } from "drizzle-orm";
import { type Browser, chromium, type Page } from "playwright";
import { stripe } from "../db/billing";
import { makeMember } from "../db/member";
import { db, recordTurn } from "../db/queries";
import { turns } from "../db/schema";
import { readLimits } from "../rules/limits";

// A visitor's path in a real browser, against the real model and Stripe's test mode:
// ask a question and see its sources, hit the per-minute limit, then sign in as a member and open billing.

const URL = `http://localhost:${findProduct("site-assistant").port}`;
const BUSY_IP = "203.0.113.7";
let server: ChildProcess | undefined;
let browser: Browser;
let customerId: string | undefined;

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(2_000) }).catch(
    () => undefined,
  );
  return response?.ok ?? false;
}

// Uses the server you already run with `bun run dev site-assistant`, or starts one for this test.
async function startServer() {
  if (await isUp()) return;
  server = spawn("bun", ["scripts/dev.ts", "site-assistant"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp()) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`The site assistant did not start on ${URL}.`);
}

beforeAll(async () => {
  await startServer();
  browser = await chromium.launch();
}, 90_000);

afterAll(async () => {
  await db.delete(turns).where(eq(turns.visitor, `ip:${BUSY_IP}`));
  if (customerId) await stripe().customers.del(customerId);
  await browser?.close();
  if (server?.pid) process.kill(-server.pid);
});

async function ask(page: Page, question: string) {
  await page.getByPlaceholder("Ask about labs, workshops, Pro or billing").fill(question);
  await page.getByRole("button", { name: "Send" }).click();
}

test("a visitor gets a cited answer and can open its sources", async () => {
  const page = await browser.newPage();
  await page.goto(URL);
  await page.getByRole("button", { name: "How much is Pro, and what does it add?" }).click();
  const answer = page.locator(".message-assistant .markdown", { hasText: "$149" });
  await answer.first().waitFor({ timeout: 60_000 });
  await page.getByText("Searched the site").first().click();
  expect(await page.locator(".source a").first().getAttribute("href")).toStartWith(
    "https://www.learnwithparam.com",
  );
}, 90_000);

test("a visitor over the per-minute limit gets a 429 before any model call", async () => {
  const { perMinute } = readLimits(process.env);
  for (let question = 0; question < perMinute; question++) {
    await recordTurn({ visitor: `ip:${BUSY_IP}`, action: "answer", confidence: 1 });
  }
  const response = await fetch(`${URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": BUSY_IP },
    body: JSON.stringify({ messages: [] }),
  });
  expect(response.status).toBe(429);
  expect(await response.text()).toContain("Wait a moment");
});

test("a signed-in member opens Stripe's billing portal in a new tab", async () => {
  const page = await browser.newPage();
  const email = `member-${crypto.randomUUID()}@example.com`;
  await page.goto(`${URL}/sign-in`);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByPlaceholder("Your name").fill("Test Member");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password, at least 10 characters").fill("a long test password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${URL}/`);
  customerId = (await makeMember(email))?.customerId;
  await ask(page, "I want to update the card I pay with.");
  const button = page.getByRole("link", { name: "Manage billing" });
  await button.waitFor({ timeout: 60_000 });
  expect(await button.getAttribute("target")).toBe("_blank");
  expect(await button.getAttribute("href")).toStartWith("https://billing.stripe.com/");
}, 120_000);
