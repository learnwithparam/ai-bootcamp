import { afterAll, beforeAll, expect, test } from "bun:test";
import { findProduct } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { type Browser, chromium, type Page } from "playwright";
import { PORTAL } from "../agent/portal";
import { INBOX } from "../db/inbox";
import { addOperator } from "../db/people";
import { addEmail, removeEmails } from "../db/queries";
import { makeAccount, PASSWORD, removeAccounts } from "./accounts";
import { ensureRunning, removePortalRequests } from "./portal";

// Both people's paths in a real browser, with the real model and the real portal.
// The intake lead runs the agent on an email, approves it if it waits, and opens the request it made.
// The intake assistant runs it on another and takes it over mid-run. A signed-in stranger gets a 404.

const URL = `http://localhost:${findProduct("browser-agent").port}`;
const tag = crypto.randomUUID().slice(0, 6);
const LEAD_SUBJECT = `Unpaid wages ${tag}`;
const ASSISTANT_SUBJECT = `Unpaid wages, again ${tag}`;
const SENDER = `e2e-${crypto.randomUUID()}@example.com`;
const stops: (() => void)[] = [];
const accounts: { id: string; email: string }[] = [];
const emailIds: string[] = [];
let browser: Browser;

beforeAll(async () => {
  stops.push(
    await ensureRunning("legal-intake", PORTAL),
    await ensureRunning("browser-agent", `${URL}/sign-in`),
  );
  browser = await chromium.launch();
  accounts.push(
    await makeAccount("Test Lead"),
    await makeAccount("Test Assistant"),
    await makeAccount("Test Stranger"),
  );
  await addOperator(accounts[0]?.id as string, "lead");
  await addOperator(accounts[1]?.id as string, "assistant");
  const ruth = INBOX[0];
  if (!ruth) throw new Error("The sample inbox is empty.");
  for (const subject of [LEAD_SUBJECT, ASSISTANT_SUBJECT])
    emailIds.push(await addEmail({ ...ruth, subject, fromEmail: SENDER }));
}, 120_000);

afterAll(async () => {
  await removeEmails(emailIds);
  await removePortalRequests([SENDER]);
  await removeAccounts(accounts.map((account) => account.id));
  await browser?.close();
  for (const stop of stops) stop();
});

async function signIn(email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  return page;
}

// Opens the email in the inbox and presses Run the agent, then waits for the agent's browser to appear.
async function runAgentOn(page: Page, subject: string) {
  await page.getByRole("link", { name: new RegExp(subject) }).click();
  // The inbox opens on the newest email, so wait for this one before pressing its button.
  await page.getByRole("heading", { level: 2, name: subject, exact: true }).waitFor();
  await page.getByRole("button", { name: "Run the agent" }).click();
  await page.waitForURL(/\/runs\/[0-9a-f-]{36}$/);
  await page.getByRole("img", { name: /intake portal/ }).waitFor({ timeout: 60_000 });
}

test("a stranger signed in gets a 404 on the inbox", async () => {
  const page = await signIn(accounts[2]?.email as string);
  await page.waitForLoadState("networkidle");
  expect(await page.getByRole("heading", { name: "Inbox" }).count()).toBe(0);
  expect((await page.goto(`${URL}/`))?.status()).toBe(404);
}, 60_000);

test("the intake lead runs the agent, approves it if it waits, and opens the request it made", async () => {
  const page = await signIn(accounts[0]?.email as string);
  await runAgentOn(page, LEAD_SUBJECT);
  const approve = page.getByRole("button", { name: "Approve and send" });
  const sent = page.getByRole("link", { name: "Open the request on the portal" });
  await approve.or(sent).waitFor({ timeout: 120_000 });
  if (await approve.isVisible()) await approve.click();
  await sent.waitFor({ timeout: 60_000 });
  expect(await sent.getAttribute("href")).toMatch(/\/requests\/[\w-]{32}$/);
  await checkPage(page);
}, 240_000);

test("the intake assistant takes a run over mid-way, and the agent stops before sending", async () => {
  const page = await signIn(accounts[1]?.email as string);
  await runAgentOn(page, ASSISTANT_SUBJECT);
  await page.getByRole("button", { name: "Take over" }).click();
  await page.getByRole("heading", { name: "Send this one by hand" }).waitFor({ timeout: 60_000 });
  expect(await page.getByText("Test Assistant took it over").count()).toBeGreaterThan(0);
  expect(await page.getByRole("link", { name: "Open the request on the portal" }).count()).toBe(0);
  expect(await page.getByRole("button", { name: "Approve and send" }).count()).toBe(0);
  await checkPage(page);
}, 240_000);
