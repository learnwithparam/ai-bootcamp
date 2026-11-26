import { type ChildProcess, spawn } from "node:child_process";
import { findProduct } from "@bootcamp/products";
import type { Page } from "playwright";

// What the browser test needs to reach the product: a running server, an account, and the messenger.

export const URL = `http://localhost:${findProduct("site-assistant").port}`;
let server: ChildProcess | undefined;

async function isUp(): Promise<boolean> {
  // Any answer means a server holds the port; a busy dev server can take seconds to compile a page.
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(15_000) }).catch(
    () => undefined,
  );
  return response !== undefined;
}

// Uses the server you already run with `bun run dev site-assistant`, or starts one for this test.
export async function startServer() {
  if (await isUp()) return;
  server = spawn("bun", ["scripts/dev.ts", "site-assistant"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp()) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`The site assistant did not start on ${URL}.`);
}

export function stopServer() {
  // Only a server this test started and that is still running.
  if (server?.pid && server.exitCode === null) process.kill(-server.pid);
}

export async function signUp(page: Page, email: string, name = "Test Member") {
  await page.goto(`${URL}/sign-in`);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a long test password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${URL}/`, { timeout: 60_000 });
}

export async function openMessenger(page: Page) {
  await page.getByRole("button", { name: "Ask a question" }).click();
  await page.getByRole("textbox", { name: "Your message" }).waitFor();
}

export async function ask(page: Page, question: string) {
  await page.getByRole("textbox", { name: "Your message" }).fill(question);
  await page.getByRole("button", { name: "Send" }).click();
}
