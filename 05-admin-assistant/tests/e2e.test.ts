import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { findProduct } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { eq } from "drizzle-orm";
import { type Browser, chromium, type Page } from "playwright";
import { codeExists, type MadeCode, removeCode } from "../db/coupons";
import { addOwner, db } from "../db/queries";
import { changes } from "../db/schema";
import { makeAccount, PASSWORD, removeAccounts } from "./accounts";

// The owner's path in a real browser, against the real model and Stripe's test mode:
// a stranger sees nothing, the owner asks for a chart, then approves a discount code and opens it in Stripe.

const URL = `http://localhost:${findProduct("admin-assistant").port}`;
let server: ChildProcess | undefined;
let browser: Browser;
const accounts: { id: string; email: string }[] = [];

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(2_000) }).catch(
    () => undefined,
  );
  return response?.ok ?? false;
}

// Uses the server you already run with `bun run dev admin-assistant`, or starts one for this test.
async function startServer() {
  if (await isUp()) return;
  server = spawn("bun", ["scripts/dev.ts", "admin-assistant"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp()) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`The admin assistant did not start on ${URL}.`);
}

beforeAll(async () => {
  await startServer();
  browser = await chromium.launch();
  accounts.push(await makeAccount("Test Owner"), await makeAccount("Test Stranger"));
  await addOwner(accounts[0]?.id as string);
}, 90_000);

afterAll(async () => {
  const owner = accounts[0]?.id as string;
  const made = await db.select().from(changes).where(eq(changes.userId, owner));
  for (const change of made) if (change.tool === "create_coupon") await removeCode(change.output as MadeCode);
  await db.delete(changes).where(eq(changes.userId, owner));
  await removeAccounts(accounts.map((account) => account.id));
  await browser?.close();
  if (server?.pid) process.kill(-server.pid);
});

async function signIn(email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/sign-in`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password, at least 10 characters").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${URL}/`);
  return page;
}

test("a signed-in stranger gets a 404 on the page and on the chat", async () => {
  const page = await signIn(accounts[1]?.email as string);
  expect(await page.getByText("Ask about signups, codes or the newsletter").count()).toBe(0);
  const cookies = await page.context().cookies();
  const response = await fetch(`${URL}/api/chat`, {
    method: "POST",
    headers: { cookie: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ") },
    body: JSON.stringify({ messages: [] }),
  });
  expect(response.status).toBe(404);
}, 60_000);

test("the owner asks for signups and gets a chart", async () => {
  const page = await signIn(accounts[0]?.email as string);
  await page.getByRole("button", { name: "How many people signed up in the last 30 days?" }).click();
  await page.locator("svg.chart").waitFor({ timeout: 60_000 });
  expect(await page.locator("svg.chart .bar").count()).toBe(30);
  await checkPage(page);
}, 90_000);

test("the owner approves a code in the browser, and it is made in Stripe", async () => {
  const code = `E2E${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;
  const page = await signIn(accounts[0]?.email as string);
  await page
    .getByPlaceholder("Ask about signups, codes or the newsletter")
    .fill(`Make a 15% code ${code} for the first payment.`);
  await page.getByRole("button", { name: "Send" }).click();
  const approve = page.getByRole("button", { name: "Approve and make it" });
  await approve.waitFor({ timeout: 60_000 });
  expect(await codeExists(code)).toBe(false);
  await approve.click();
  const link = page.getByRole("link", { name: "Open it in Stripe" });
  await link.waitFor({ timeout: 60_000 });
  expect(await link.getAttribute("href")).toStartWith("https://dashboard.stripe.com/test/");
  expect(await codeExists(code)).toBe(true);
}, 150_000);
