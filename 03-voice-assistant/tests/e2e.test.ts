import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { portOf } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { type Browser, chromium, type Page } from "playwright";
import { COOKIE } from "../app/caller";
import { addToTeam } from "../db/queries";
import { lineAfterSilence, makeAccount, PASSWORD, removeAccounts, removeCallers } from "./accounts";

// Each role's path in a real browser, on a real call: a caller presses Call with Chromium's fake microphone
// playing a recorded line, hears the clinic is closed on Sunday, and hangs up. The receptionist signs in,
// finds that call on the front desk and reads its transcript. An account not on the team gets a 404.

const URL = `http://localhost:${portOf("voice-assistant")}`;
let server: ChildProcess | undefined;
let browser: Browser;
const accounts: { id: string; email: string }[] = [];
const callers: string[] = [];

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(2_000) }).catch(
    () => undefined,
  );
  return response?.ok ?? false;
}

// Uses the site and phone worker you already run with `bun run dev voice-assistant`, or starts both.
async function startServer() {
  if (await isUp()) return;
  server = spawn("bun", ["scripts/dev.ts", "voice-assistant"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp()) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`The clinic site did not start on ${URL}.`);
}

beforeAll(async () => {
  await startServer();
  const microphone = await lineAfterSilence("sunday-1", 10);
  browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${microphone}%noloop`,
    ],
  });
  accounts.push(await makeAccount("Test Receptionist"), await makeAccount("Test Patient"));
  await addToTeam(accounts[0]?.id as string);
}, 90_000);

afterAll(async () => {
  await removeCallers(callers);
  await removeAccounts(accounts.map((account) => account.id));
  await browser?.close();
  if (server?.pid) process.kill(-server.pid);
});

async function signIn(email: string, next = "/desk"): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/sign-in?next=${next}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${URL}${next}`);
  return page;
}

test("a caller rings for Sunday, hears the clinic is closed, and hangs up", async () => {
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();
  await page.goto(URL);
  await checkPage(page);
  await page.getByRole("button", { name: "Call the clinic" }).click();
  const phone = page.getByRole("region", { name: "Call the clinic" });
  await phone.getByText("Hello, Harbour Physio. How can I help?").waitFor({ timeout: 30_000 });
  await phone
    .getByText(/Sunday/)
    .first()
    .waitFor({ timeout: 45_000 });
  await phone.getByText(/closed/i).waitFor({ timeout: 45_000 });
  await checkPage(page);
  const cookie = (await context.cookies()).find((one) => one.name === COOKIE);
  if (cookie) callers.push(cookie.value);
  await page.getByRole("button", { name: "End call" }).click();
  await page.getByText("Call ended").waitFor();
  expect(await page.getByRole("button", { name: "Call again" }).isVisible()).toBe(true);
}, 120_000);

test("the receptionist finds that call on the front desk and reads what was said", async () => {
  const page = await signIn(accounts[0]?.email as string);
  await page.getByRole("heading", { name: "Phone calls" }).waitFor();
  await checkPage(page);
  await page.locator("a.row-link").first().click();
  await page.getByRole("heading", { name: "What was said" }).waitFor();
  await page
    .getByText(/closed/i)
    .first()
    .waitFor({ timeout: 15_000 });
  await checkPage(page);
  await page.getByRole("link", { name: "Diary" }).click();
  await page.waitForURL(`${URL}/desk/diary`);
  await checkPage(page);
}, 60_000);

test("a signed-in account not on the team gets a 404, and a visitor is sent to sign in", async () => {
  const page = await signIn(accounts[1]?.email as string, "/");
  const response = await page.goto(`${URL}/desk`);
  expect(response?.status()).toBe(404);
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`${URL}/desk`);
  expect(new globalThis.URL(visitor.url()).pathname).toBe("/sign-in");
});
