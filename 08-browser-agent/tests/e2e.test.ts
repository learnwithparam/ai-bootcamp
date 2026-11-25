import { afterAll, beforeAll, expect, test } from "bun:test";
import { findProduct } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { type Browser, chromium, type Page } from "playwright";
import { PORTAL } from "../agent/portal";
import { INBOX } from "../db/inbox";
import { addEmail, addOperator, removeEmails } from "../db/queries";
import { makeAccount, PASSWORD, removeAccounts } from "./accounts";
import { ensureRunning, removePortalRequests } from "./portal";

// The whole path in a real browser, with the real model and the real portal: an operator starts the agent
// on an email, watches it fill the portal, approves it if it waits, and opens the request it made.
// A signed-in account that is not an operator gets a 404.

const URL = `http://localhost:${findProduct("browser-agent").port}`;
const SUBJECT = `Unpaid wages ${crypto.randomUUID().slice(0, 6)}`;
const SENDER = `e2e-${crypto.randomUUID()}@example.com`;
const stops: (() => void)[] = [];
const accounts: { id: string; email: string }[] = [];
let emailId = "";
let browser: Browser;

beforeAll(async () => {
  stops.push(
    await ensureRunning("legal-intake", PORTAL),
    await ensureRunning("browser-agent", `${URL}/sign-in`),
  );
  browser = await chromium.launch();
  accounts.push(await makeAccount("Test Operator"), await makeAccount("Test Stranger"));
  await addOperator(accounts[0]?.id as string);
  const ruth = INBOX[0];
  if (!ruth) throw new Error("The sample inbox is empty.");
  emailId = await addEmail({ ...ruth, subject: SUBJECT, fromEmail: SENDER });
}, 120_000);

afterAll(async () => {
  await removeEmails([emailId]);
  await removePortalRequests([SENDER]);
  await removeAccounts(accounts.map((account) => account.id));
  await browser?.close();
  for (const stop of stops) stop();
});

async function signIn(email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/sign-in`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password, at least 10 characters").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  return page;
}

test("a stranger signed in gets a 404 on the inbox", async () => {
  const page = await signIn(accounts[1]?.email as string);
  await page.waitForLoadState("networkidle");
  expect(await page.getByRole("heading", { name: "Client emails" }).count()).toBe(0);
  expect((await page.goto(`${URL}/`))?.status()).toBe(404);
}, 60_000);

test("an operator runs the agent, approves it if it waits, and opens the request it made", async () => {
  const page = await signIn(accounts[0]?.email as string);
  const row = page.getByRole("listitem").filter({ hasText: SUBJECT });
  await row.getByRole("button", { name: "Run the agent" }).click();
  await page.waitForURL(/\/runs\/[0-9a-f-]{36}$/);
  await page.getByRole("img", { name: /intake portal/ }).waitFor({ timeout: 60_000 });

  const approve = page.getByRole("button", { name: "Approve and send" });
  const sent = page.getByRole("link", { name: "Open the request on the portal" });
  await approve.or(sent).waitFor({ timeout: 120_000 });
  if (await approve.isVisible()) await approve.click();
  await sent.waitFor({ timeout: 60_000 });
  expect(await sent.getAttribute("href")).toMatch(/\/requests\/[\w-]{32}$/);
  await expect(page.getByText("Sent", { exact: true }).count()).resolves.toBeGreaterThan(0);
  await checkPage(page);
}, 240_000);
