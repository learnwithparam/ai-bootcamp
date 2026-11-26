import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";
import { findProduct } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { type Browser, chromium, type Page } from "playwright";
import { db } from "../db/queries";
import { billEvents, bills } from "../db/schema";
import { SAMPLE_FOLDER } from "../db/seed";

// Both people's paths in a real browser, as the seeded clerk and approver.
// The clerk uploads two copies of a bill the team already has. The assistant reads them for real and flags each
// as a duplicate. The clerk accepts the suggestion on one and decides the other; the approver signs it
// off and records it paid. The model reads both PDFs, so this runs in `bun run proof`, not in `bun run check`.

const URL = `http://localhost:${findProduct("invoice-inbox").port}`;
const FILE = "invoice_10251.pdf";
const started = new Date();
let server: ChildProcess | undefined;
let browser: Browser;

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(15_000) }).catch(
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

// The copies this test uploaded, newest first.
const uploaded = () =>
  db
    .select({ id: bills.id, status: bills.status })
    .from(bills)
    .where(and(eq(bills.fileName, FILE), gt(bills.receivedAt, started)))
    .orderBy(desc(bills.receivedAt));

beforeAll(async () => {
  await startServer();
  browser = await chromium.launch();
}, 90_000);

// The seeded queues stay as they were, so screenshots and the next run see the same bills.
afterAll(async () => {
  await browser?.close();
  const ids = (await uploaded()).map((bill) => bill.id);
  if (ids.length) {
    await db.delete(billEvents).where(inArray(billEvents.billId, ids));
    await db.delete(bills).where(inArray(bills.id, ids));
  }
  // Only a server this test started and that is still running.
  if (server?.pid && server.exitCode === null) process.kill(-server.pid);
});

async function signIn(who: "ana" | "hanna"): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/sign-in`);
  await page.getByLabel("Email").fill(`${who}@bills-seed.learnwithparam.test`);
  await page.getByLabel("Password").fill("seeded bills password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/bills/);
  return page;
}

// Waits until the assistant has read every copy, then returns them.
async function readCopies(count: number) {
  for (let attempt = 0; attempt < 90; attempt++) {
    const copies = await uploaded();
    if (copies.length === count && copies.every((copy) => copy.status !== "reading")) return copies;
    await Bun.sleep(1_000);
  }
  throw new Error(`The assistant did not finish reading ${count} copies of ${FILE}.`);
}

async function clerkAcceptsTheFix(clerk: Page, id: string) {
  // The assistant names the duplicate and suggests rejecting it. One click accepts.
  await clerk.goto(`${URL}/bills/${id}`);
  await clerk
    .getByRole("region", { name: "What does not match" })
    .getByText("Bill 10251 was already received.")
    .waitFor();
  await clerk.getByRole("button", { name: "Accept" }).click();
  await clerk.locator("h1").getByText("Rejected").waitFor();
  await checkPage(clerk);
}

async function clerkDecides(clerk: Page, id: string, note: string) {
  // On the other copy the clerk decides, and the amount needs a note.
  await clerk.goto(`${URL}/bills/${id}`);
  await clerk.getByLabel("Pay a different amount").check();
  await clerk.getByLabel("Amount to pay").fill("654.06");
  await clerk.getByRole("button", { name: "Save decision" }).click();
  await clerk.getByText("Write a note that says why this amount.").waitFor();
  await clerk.getByLabel("Note").fill(note);
  await clerk.getByRole("button", { name: "Save decision" }).click();
  await clerk.getByText("Waiting for a finance approver").waitFor();
  expect(await clerk.getByRole("button", { name: "Approve for payment" }).count()).toBe(0);
}

async function approverPays(id: string, note: string) {
  // The approver signs it off, then records the payment. Each step lands in the activity log.
  const approver = await signIn("hanna");
  await approver.goto(`${URL}/bills/${id}`);
  await approver.getByRole("region", { name: "Activity" }).getByText(note, { exact: false }).waitFor();
  await approver.getByRole("button", { name: "Approve for payment" }).click();
  await approver.getByRole("button", { name: "Record as paid" }).click();
  await approver.locator("h1").getByText("Paid").waitFor();
  await checkPage(approver);
}

test("a clerk clears two duplicates, and an approver pays the one the clerk let through", async () => {
  const clerk = await signIn("ana");
  await clerk
    .locator("input[name=bills]")
    .setInputFiles([join(SAMPLE_FOLDER, FILE), join(SAMPLE_FOLDER, FILE)]);
  await clerk.getByText("2 bills uploaded.").waitFor({ timeout: 30_000 });
  const [second, first] = await readCopies(2);
  if (!first || !second) throw new Error("Expected two copies.");
  expect([first.status, second.status]).toEqual(["review", "review"]);

  const note = `The supplier voided the first copy (${crypto.randomUUID()}).`;
  await clerkAcceptsTheFix(clerk, first.id);
  await clerkDecides(clerk, second.id, note);
  await approverPays(second.id, note);
  expect((await readCopies(2)).map((copy) => copy.status)).toEqual(["paid", "rejected"]);
}, 180_000);
