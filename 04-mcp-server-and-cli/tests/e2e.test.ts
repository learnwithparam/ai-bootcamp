import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findProduct } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { $ } from "bun";
import { type Browser, chromium } from "playwright";

// The learner's path, for real: `bun run cli login` prints a code, a person approves it in a browser,
// and the CLI then calls a personal tool over MCP. The CLI keeps its tokens in a throwaway home folder.

const URL = `http://localhost:${findProduct("mcp-server-and-cli").port}`;
let server: ChildProcess | undefined;
let browser: Browser;
let home: string;

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

afterAll(async () => {
  await browser.close();
  await rm(home, { recursive: true, force: true });
  if (server?.pid) process.kill(-server.pid);
});

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

async function approveInBrowser(code: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/device?user_code=${code}`);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("E2E Learner");
  await page.getByLabel("Email").fill(`e2e-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("heading", { name: "The CLI is signed in" }).waitFor();
  await checkPage(page);
  await page.close();
}

test("the MCP endpoint refuses a call with no token and says where to sign in", async () => {
  const response = await fetch(`${URL}/mcp`, { method: "POST", body: "{}" });
  expect(response.status).toBe(401);
  expect(response.headers.get("www-authenticate")).toContain("/.well-known/oauth-protected-resource");
});

test("the CLI signs in through the browser, then saves and lists as that person", async () => {
  const { code, done } = await startLogin();
  await approveInBrowser(code);
  expect(await done).toBe(0);
  expect((await stat(join(home, ".config/learnwithparam/tokens.json"))).mode & 0o777).toBe(0o600);
  const cli = (...args: string[]) => $`bun run cli ${args}`.env({ ...process.env, HOME: home }).quiet();
  const upcoming = JSON.parse((await cli("upcoming-sessions")).stdout.toString());
  const first = upcoming.sessions[0];
  await cli("save-for-later", first.url);
  const list = JSON.parse((await cli("my-saved-list")).stdout.toString());
  expect(list.items.map((item: { url: string }) => item.url)).toEqual([first.url]);
}, 90_000);

test("an edited consent link is refused", async () => {
  const response = await fetch(`${URL}/consent?client_id=evil&scope=openid&exp=9999999999&sig=forged`);
  expect(response.status).toBe(404);
});
