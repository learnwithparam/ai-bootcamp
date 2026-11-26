import { afterAll, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { latestSession, readText } from "@bootcamp/coding-harness/agent/session-file";
import { readSession, summarize } from "@bootcamp/coding-harness/rules/session";
import { checkScreen } from "./screen";
import { KEYS, type Running, start } from "./terminal";

// The real app, `bun run terminal`, in a real pseudo-terminal, typed at as a person types.
// Runs in `bun run proof`. It types /practice months, says yes at the permission prompt,
// and waits for the real model's fix to pass the check. Every screen it reaches goes through checkScreen.

let app: Running | undefined;
afterAll(() => app?.close());

// Answers each prompt with 2, "allow until I quit", and checks every screen on the way.
async function runToTheEnd(running: Running, seconds: number): Promise<number> {
  const until = Date.now() + seconds * 1000;
  let asked = 0;
  while (Date.now() < until) {
    const screen = running.text();
    checkScreen(screen);
    if (screen.includes("Saved this run")) return asked;
    if (screen.includes("Yes, this once")) {
      asked++;
      await running.press("2");
    }
    await Bun.sleep(200);
  }
  throw new Error(`The run did not end in ${seconds}s. The screen shows:\n${running.text()}`);
}

test("/practice months: a prompt waits for you, then the fix passes the check", async () => {
  app = start();
  checkScreen(await app.waitFor("/help shows the commands"));
  await app.type("/pr");
  expect(await app.waitFor("/practice months")).toContain("(Tab)");
  await app.press(KEYS.tab);
  await app.press(KEYS.enter);
  expect(await app.waitFor("Making a fresh copy of vercel/ms")).toContain("> /practice months");
  const asked = await runToTheEnd(app, 400);
  expect(asked).toBeGreaterThan(0);
  const end = app.text();
  expect(end).toContain("✓ Check passed");
  expect(end).toMatch(/tests: \d+ passed/);
  // The run on disk is the run on screen: the same file a reviewer replays on product 10's site.
  const path = await latestSession();
  expect(existsSync(path)).toBe(true);
  expect(summarize(readSession(await readText(path))).outcome).toBe("passed");
  await app.press(KEYS.ctrlO);
  checkScreen(await app.waitFor("Ctrl+O less"));
}, 480_000);
