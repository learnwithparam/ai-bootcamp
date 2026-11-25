import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { findProduct } from "@bootcamp/products";
import { type Browser, chromium, type Page } from "playwright";

// A person's whole path in a real browser: create an account, research a company, watch the report fill in,
// and check that another account cannot open it. The model and the web are real, so this runs in `bun run proof`.

const URL = `http://localhost:${findProduct("research-agent").port}`;
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
  if (server?.pid) process.kill(-server.pid);
});

async function createAccount(page: Page, name: string) {
  await page.goto(`${URL}/sign-in`);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByPlaceholder("Your name").fill(name);
  await page.getByPlaceholder("Email").fill(`${name.toLowerCase()}-${crypto.randomUUID()}@example.com`);
  await page.getByPlaceholder("Password, at least 10 characters").fill("a long test password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${URL}/`);
}

test("a seller researches a company, gets a score with sources, and a stranger gets a 404", async () => {
  const page = await browser.newPage();
  await createAccount(page, "Seller");
  await page.getByLabel(/Research a company/).fill("linear.app");
  await page.getByRole("button", { name: "Research" }).click();
  await page.waitForURL(/\/reports\/[0-9a-f-]{36}$/);
  const reportUrl = page.url();

  // The page reloads itself while the graph runs. The score appears when it is done.
  await page.getByLabel("Lead score").waitFor({ timeout: 150_000 });
  await expect(page.getByRole("heading", { name: "Linear" }).count()).resolves.toBe(1);
  const sources = page.locator(".claim-meta a[target=_blank]");
  await expect(sources.count()).resolves.toBeGreaterThanOrEqual(4);

  // A second account opens the same address and finds nothing there.
  const stranger = await browser.newPage();
  await createAccount(stranger, "Stranger");
  const response = await stranger.goto(reportUrl);
  expect(response?.status()).toBe(404);
}, 240_000);
