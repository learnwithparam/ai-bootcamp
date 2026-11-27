import { type ChildProcess, spawn } from "node:child_process";
import { portOf } from "@bootcamp/products";
import type { Page } from "playwright";

// What the browser test needs: a running server, an account, and a way to ask.

export const URL = `http://localhost:${portOf("marketplace-analyst")}`;
let server: ChildProcess | undefined;

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(15_000) }).catch(
    () => undefined,
  );
  return response !== undefined;
}

// Uses the server you already run with `bun run dev marketplace-analyst`, or starts one for this test.
export async function startServer() {
  if (await isUp()) return;
  server = spawn("bun", ["scripts/dev.ts", "marketplace-analyst"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp()) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`The marketplace analyst did not start on ${URL}.`);
}

export function stopServer() {
  if (server?.pid && server.exitCode === null) process.kill(-server.pid);
}

export async function signUp(page: Page, email: string) {
  await page.goto(`${URL}/sign-in`);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Test Analyst");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a long test password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${URL}/`, { timeout: 60_000 });
}

// Asks, then waits for the route map to report how long the answer took.
export async function ask(page: Page, question: string) {
  const answered = await page.locator(".route-total", { hasText: "Took" }).count();
  await page.getByRole("textbox", { name: "Your question" }).fill(question);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.locator(".route-total", { hasText: "Took" }).nth(answered).waitFor({ timeout: 90_000 });
}
