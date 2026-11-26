import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { portOf } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { type Browser, chromium, type Page } from "playwright";
import { COOKIE } from "../app/shopper";
import { addToTeam, enabledTypes, setTypeEnabled } from "../db/queries";
import { makeAccount, PASSWORD, removeAccounts, removeOwners } from "./accounts";

// Each role's path in a real browser, against the real model: a guest tells the shop how they shop,
// the page rebuilds itself, and nothing reaches the basket until they press Add all. A chip hides
// products at once, the merchandiser reads what the agent did and turns a section off, and a
// signed-in shopper who is not on the team gets a 404.

const URL = `http://localhost:${portOf("personal-storefront")}`;
let server: ChildProcess | undefined;
let browser: Browser;
const accounts: { id: string; email: string }[] = [];
const guests: string[] = [];

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(2_000) }).catch(
    () => undefined,
  );
  return response?.ok ?? false;
}

// Uses the server you already run with `bun run dev personal-storefront`, or starts one for this test.
async function startServer() {
  if (await isUp()) return;
  server = spawn("bun", ["scripts/dev.ts", "personal-storefront"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp()) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`The storefront did not start on ${URL}.`);
}

beforeAll(async () => {
  await startServer();
  browser = await chromium.launch();
  accounts.push(await makeAccount("Test Merchandiser"), await makeAccount("Test Shopper"));
  await addToTeam(accounts[0]?.id as string);
}, 90_000);

afterAll(async () => {
  await setTypeEnabled("hero", true);
  await removeOwners(guests.map((guest) => `guest:${guest}`));
  await removeAccounts(accounts.map((account) => account.id));
  await browser?.close();
  if (server?.pid) process.kill(-server.pid);
});

async function guestPage(): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(URL);
  await page.getByRole("heading", { name: "Good food, fair prices" }).waitFor();
  return page;
}

async function signIn(email: string, next = "/"): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/sign-in?next=${next}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${URL}${next}`);
  return page;
}

async function rememberGuest(page: Page) {
  const cookie = (await page.context().cookies()).find((one) => one.name === COOKIE);
  if (cookie) guests.push(cookie.value);
}

test("a guest asks, the page rebuilds for a nut allergy, and the basket waits for Add all", async () => {
  const page = await guestPage();
  await checkPage(page);
  await page
    .getByLabel("Tell us how you shop")
    .fill("No nuts please, my son is allergic. Fill my basket for the week");
  await page.getByRole("button", { name: "Change my page" }).click();
  const card = page.getByRole("region", { name: "Suggested basket" });
  await card.waitFor({ timeout: 120_000 });
  await rememberGuest(page);
  const chips = page.getByRole("region", { name: "What we know about you" });
  expect(await chips.getByText("No tree nuts").count()).toBe(1);
  expect(await page.locator("main .tag", { hasText: /nuts/i }).count()).toBe(0);
  expect(await page.getByRole("link", { name: /Basket is empty/ }).count()).toBe(1);
  await checkPage(page);
  await card.getByRole("button", { name: "Add all" }).click();
  await card.getByText("Added to your basket.").waitFor({ timeout: 30_000 });
  // The card answers at once; the top bar changes only when the server has saved the basket.
  await page.getByRole("link", { name: /^Basket \d+/ }).waitFor({ timeout: 30_000 });
  await page.goto(`${URL}/basket`);
  expect(await page.getByRole("button", { name: "Take out" }).count()).toBeGreaterThan(0);
  await checkPage(page);
}, 180_000);

test("adding an allergy chip hides those products at once, with no model call", async () => {
  const page = await guestPage();
  const gluten = page.locator("main .tag", { hasText: /gluten/i });
  expect(await gluten.count()).toBeGreaterThan(0);
  await page.getByLabel("Add an allergy").selectOption("gluten");
  await page.getByRole("region", { name: "What we know about you" }).getByText("No gluten").waitFor();
  expect(await gluten.count()).toBe(0);
  await checkPage(page);
}, 60_000);

test("the merchandiser reads a personalization and turns the banner off for every shopper", async () => {
  const page = await signIn(accounts[0]?.email as string, "/merchandising");
  await page.locator("table a").first().click();
  await page.getByRole("heading", { name: "The page the agent laid out" }).waitFor();
  await checkPage(page);
  await page.goto(`${URL}/merchandising`);
  await page.getByRole("button", { name: "Banner: on" }).click();
  await page.getByRole("button", { name: "Banner: off" }).waitFor();
  expect(await enabledTypes()).not.toContain("hero");
  await checkPage(page);
}, 90_000);

test("a signed-in shopper who is not on the team gets a 404 on the merchandising pages", async () => {
  const page = await signIn(accounts[1]?.email as string);
  const response = await page.goto(`${URL}/merchandising`);
  expect(response?.status()).toBe(404);
}, 60_000);
