import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";
import { findProduct } from "@bootcamp/products";
import { type Browser, chromium, type Page } from "playwright";
import { SAMPLE_FOLDER } from "../db/seed";

// A person's whole path in a real browser: create an account, upload two invoices,
// open the one that needs a person, reject it with a note, and find it under Decided.
// The model reads both invoices for real, so this runs in `bun run proof`, not in `bun run check`.

const URL = `http://localhost:${findProduct("invoice-inbox").port}`;
let server: ChildProcess | undefined;
let browser: Browser;

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(2_000) }).catch(
    () => undefined,
  );
  return response?.ok ?? false;
}

// Uses the server you already run with `bun run dev invoice-inbox`, or starts one for this test.
async function startServer() {
  if (await isUp()) return;
  // Its own process group, so stopping it also stops the Next.js server it starts.
  server = spawn("bun", ["scripts/dev.ts", "invoice-inbox"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp()) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`The invoice inbox did not start on ${URL}.`);
}

beforeAll(async () => {
  await startServer();
  browser = await chromium.launch();
}, 90_000);

afterAll(async () => {
  await browser?.close();
  if (server?.pid) process.kill(-server.pid);
});

async function createAccount(page: Page) {
  await page.goto(`${URL}/sign-in`);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByPlaceholder("Your name").fill("Test Clerk");
  await page.getByPlaceholder("Email").fill(`clerk-${crypto.randomUUID()}@example.com`);
  await page.getByPlaceholder("Password, at least 10 characters").fill("a long test password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${URL}/`);
}

async function upload(page: Page, orderNumbers: number[]) {
  const files = orderNumbers.map((orderNumber) => join(SAMPLE_FOLDER, `invoice_${orderNumber}.pdf`));
  await page.setInputFiles("#invoices", files);
  await page.getByRole("button", { name: "Read and check" }).click();
  await page.getByText(`Read ${files.length} invoices.`).waitFor({ timeout: 60_000 });
}

// The rows of one queue. Earlier runs may have left older copies of the same invoice.
function rows(page: Page, queue: string, hasText: string) {
  return page
    .locator("section.queue", { has: page.getByRole("heading", { name: queue }) })
    .locator(".row", { hasText });
}

test("a clerk uploads invoices, rejects the one with wrong prices, and finds it under Decided", async () => {
  const page = await browser.newPage();
  await createAccount(page);
  // Order 10250 had a 15% discount the invoice left out. Order 10248 had none.
  const matchedBefore = await rows(page, "Matched, ready to pay", "#10248").count();
  await upload(page, [10250, 10248]);
  await expect(rows(page, "Matched, ready to pay", "#10248").count()).resolves.toBe(matchedBefore + 1);

  // Oldest first, so the copy just uploaded is the last one.
  await rows(page, "Needs a person", "#10250").last().click();
  await page.getByRole("heading", { name: "Invoice 10250" }).waitFor();
  await expect(page.locator("mark").filter({ hasText: "$42.40" }).count()).resolves.toBe(1);
  await expect(page.locator("mark").filter({ hasText: "$16.80" }).count()).resolves.toBe(1);

  const note = `Asked the supplier for the 15% discount (${crypto.randomUUID()}).`;
  await page.getByLabel("Why? This note is saved with the invoice.").fill(note);
  await page.getByRole("button", { name: "Reject to supplier" }).click();
  await page.waitForURL(`${URL}/`);

  await expect(rows(page, "Decided", note).count()).resolves.toBe(1);
}, 120_000);
