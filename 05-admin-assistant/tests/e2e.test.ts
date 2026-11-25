import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { findProduct } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { eq } from "drizzle-orm";
import { type Browser, chromium, type Page } from "playwright";
import { codeExists, removeCode } from "../db/coupons";
import { saveDiscountDraft } from "../db/discounts";
import { createNewsletter, newsletterById, reviseNewsletter } from "../db/newsletters";
import { addToTeam, db } from "../db/queries";
import { discountDrafts } from "../db/schema";
import { makeAccount, PASSWORD, removeAccounts } from "./accounts";

// Each role's path in a real browser, against the real model and Stripe's test mode:
// a stranger sees nothing, staff can draft but not approve, and the owner approves on the Discounts page
// and keeps or undoes the assistant's edit to a newsletter.

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
  accounts.push(
    await makeAccount("Test Owner"),
    await makeAccount("Test Stranger"),
    await makeAccount("Test Staff"),
  );
  await addToTeam(accounts[0]?.id as string, "owner");
  await addToTeam(accounts[2]?.id as string, "staff");
}, 90_000);

afterAll(async () => {
  for (const account of accounts) {
    const made = await db.select().from(discountDrafts).where(eq(discountDrafts.askedBy, account.id));
    for (const draft of made) {
      if (draft.couponId && draft.promotionCodeId) {
        await removeCode({
          code: draft.code,
          couponId: draft.couponId,
          promotionCodeId: draft.promotionCodeId,
          link: "",
        });
      }
    }
  }
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

const code = () => `E2E${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;

test("a signed-in stranger gets a 404 on the page and on the chat", async () => {
  const page = await signIn(accounts[1]?.email as string);
  expect(await page.getByRole("button", { name: "Ask the assistant" }).count()).toBe(0);
  const cookies = await page.context().cookies();
  const response = await fetch(`${URL}/api/chat`, {
    method: "POST",
    headers: { cookie: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ") },
    body: JSON.stringify({ messages: [] }),
  });
  expect(response.status).toBe(404);
}, 60_000);

test("the owner opens the assistant from Home, asks for signups and gets a chart", async () => {
  const page = await signIn(accounts[0]?.email as string);
  await page.getByRole("heading", { name: "Suggested for you" }).waitFor();
  await checkPage(page);
  await page.locator(".assistant-pill").click();
  await page.getByRole("button", { name: "How many people signed up in the last 30 days?" }).click();
  await page.locator(".assistant-panel svg.chart").waitFor({ timeout: 60_000 });
  expect(await page.locator(".assistant-panel svg.chart .bar").count()).toBe(30);
  await checkPage(page);
}, 90_000);

test("staff see a waiting draft but cannot approve it", async () => {
  const draft = await saveDiscountDraft(
    { code: code(), percentOff: 15, duration: "once" },
    accounts[2]?.id as string,
  );
  const page = await signIn(accounts[2]?.email as string);
  await page.goto(`${URL}/discounts`);
  const row = page.locator(".draft-row", { hasText: draft.code });
  await row.waitFor();
  expect(await row.getByText("Waiting for an owner").count()).toBe(1);
  expect(await row.getByRole("button", { name: "Approve and make it" }).count()).toBe(0);
  await checkPage(page);
}, 60_000);

test("the owner approves a draft on the Discounts page, and it is made in Stripe", async () => {
  const draft = await saveDiscountDraft(
    { code: code(), percentOff: 15, duration: "once" },
    accounts[0]?.id as string,
  );
  expect(await codeExists(draft.code)).toBe(false);
  const page = await signIn(accounts[0]?.email as string);
  await page.goto(`${URL}/discounts`);
  await page
    .locator(".draft-row", { hasText: draft.code })
    .getByRole("button", { name: "Approve and make it" })
    .click();
  await page.locator(".draft-row", { hasText: draft.code }).waitFor({ state: "detached", timeout: 60_000 });
  expect(await codeExists(draft.code)).toBe(true);
  await page.getByRole("cell", { name: draft.code }).waitFor();
}, 120_000);

test("the owner reads the assistant's edit as a diff and undoes it", async () => {
  const letter = await createNewsletter("Old subject", "# Hello\n\nFirst line.", accounts[0]?.id as string);
  await reviseNewsletter(letter.id, "New subject", "# Hello\n\nA better first line.");
  const page = await signIn(accounts[0]?.email as string);
  await page.goto(`${URL}/newsletters/${letter.id}`);
  await page.locator(".diff-added", { hasText: "A better first line." }).waitFor();
  await checkPage(page);
  await page.getByRole("button", { name: "Undo the change" }).click();
  await page.locator(".diff").waitFor({ state: "detached" });
  const after = await newsletterById(letter.id);
  expect(after?.subject).toBe("Old subject");
  expect(after?.body).toBe("# Hello\n\nFirst line.");
}, 60_000);
