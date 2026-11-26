import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { portOf } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { $ } from "bun";
import { sql } from "drizzle-orm";
import { type Browser, chromium, type Page } from "playwright";
import { db } from "../db/queries";
import { saved, toolCalls } from "../db/schema";

// The learner's path, for real: `bun run cli login` prints a code, a person approves it in a browser,
// and the CLI then calls a personal tool over MCP. The CLI keeps its tokens in a throwaway home folder.

const URL = `http://localhost:${portOf("mcp-server-and-cli")}`;
let server: ChildProcess | undefined;
let browser: Browser;
let home: string;
const TEST_DOMAIN = "tools-e2e.learnwithparam.test";

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(2_000) }).catch(
    () => undefined,
  );
  return response?.ok ?? false;
}

// Uses the server you already run with `bun run dev mcp-server-and-cli`, or starts one for this test.
beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), "learnwithparam-cli-"));
  browser = await chromium.launch();
  if (await isUp()) return;
  server = spawn("bun", ["scripts/dev.ts", "mcp-server-and-cli"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60 && !(await isUp()); attempt++) await Bun.sleep(1_000);
}, 90_000);

// The test accounts go first, so a slow browser close never leaves one behind.
afterAll(async () => {
  const testUsers = sql`(select id from "user" where email like ${`%@${TEST_DOMAIN}`})`;
  await db.execute(sql`delete from ${toolCalls} where user_id in ${testUsers}`);
  await db.execute(sql`delete from ${saved} where user_id in ${testUsers}`);
  await db.execute(sql`delete from "user" where email like ${`%@${TEST_DOMAIN}`}`);
  await rm(home, { recursive: true, force: true });
  await browser.close();
  if (server?.pid) process.kill(-server.pid);
}, 30_000);

// Starts `cli login` and resolves with the code it prints, plus a promise for its exit.
function startLogin(): Promise<{ code: string; done: Promise<number> }> {
  const login = spawn("bun", ["run", "cli", "login"], { env: { ...process.env, HOME: home } });
  const done = new Promise<number>((resolve) => login.on("exit", (status) => resolve(status ?? 1)));
  return new Promise((resolve) => {
    login.stdout.on("data", (chunk: Buffer) => {
      const code = /type ([A-Z0-9]{8})/.exec(chunk.toString())?.[1];
      if (code) resolve({ code, done });
    });
  });
}

// Approves the code as a new account, and returns the signed-in page for the next steps.
async function approveInBrowser(code: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/device?user_code=${code}`);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("E2E Learner");
  await page.getByLabel("Email").fill(`e2e-${crypto.randomUUID()}@${TEST_DOMAIN}`);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("heading", { name: "The CLI is signed in" }).waitFor();
  await checkPage(page);
  return page;
}

test("the MCP endpoint refuses a call with no token and says where to sign in", async () => {
  const response = await fetch(`${URL}/mcp`, { method: "POST", body: "{}" });
  expect(response.status).toBe(401);
  expect(response.headers.get("www-authenticate")).toContain("/.well-known/oauth-protected-resource");
});

test("signed out, the tools page runs a public tool and asks to sign in for a personal one", async () => {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/?tool=search_catalog`);
  await page.getByLabel("Query").fill("agents");
  await page.getByRole("button", { name: "Run" }).click();
  await page.locator(".result-item").first().waitFor();
  await page.getByRole("button", { name: "Claude or Cursor" }).click();
  expect(await page.locator("pre.snippet").textContent()).toContain('"name": "search_catalog"');
  await checkPage(page);
  await page.goto(`${URL}/?tool=save_for_later`);
  await page.getByRole("link", { name: "Sign in to run it" }).waitFor();
  await page.goto(`${URL}/apps`);
  expect(new globalThis.URL(page.url()).pathname).toBe("/sign-in");
  await page.close();
  // The dev server compiles each page on its first visit, which can take several seconds.
}, 60_000);

test("the CLI signs in, works as that person, is revoked on the apps page, and is then refused", async () => {
  const { code, done } = await startLogin();
  const page = await approveInBrowser(code);
  expect(await done).toBe(0);
  expect((await stat(join(home, ".config/learnwithparam/tokens.json"))).mode & 0o777).toBe(0o600);
  const cli = (...args: string[]) =>
    $`bun run cli ${args}`
      .env({ ...process.env, HOME: home })
      .quiet()
      .nothrow();
  const upcoming = JSON.parse((await cli("upcoming-sessions")).stdout.toString());
  const first = upcoming.sessions[0];
  await cli("save-for-later", first.url);
  await cli("save-for-later", "https://example.com/not-in-the-catalog");
  const list = JSON.parse((await cli("my-saved-list")).stdout.toString());
  expect(list.items.map((item: { url: string }) => item.url)).toEqual([first.url]);

  await page.goto(`${URL}/activity?show=failed`);
  await page.getByRole("rowheader", { name: "Save for later" }).first().waitFor();
  expect(await page.locator("tbody tr").count()).toBe(1);
  await checkPage(page);

  await page.goto(`${URL}/apps`);
  await page.getByRole("button", { name: "Revoke" }).click();
  await page.getByRole("button", { name: "Revoke access" }).click();
  await page.getByText("No apps are connected").waitFor();
  await checkPage(page);
  const refused = await cli("my-saved-list");
  expect(refused.exitCode).not.toBe(0);
  await page.close();
}, 90_000);

test("an edited consent link is refused", async () => {
  const response = await fetch(`${URL}/consent?client_id=evil&scope=openid&exp=9999999999&sig=forged`);
  expect(response.status).toBe(404);
}, 30_000);
