import { afterAll, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { runCheck } from "@bootcamp/coding-harness/agent/check";
import { readText } from "@bootcamp/coding-harness/agent/session-file";
import { prepare } from "@bootcamp/coding-harness/agent/workspace";
import { readSession, summarize } from "@bootcamp/coding-harness/rules/session";
import { CHECK_COMMAND, findTask } from "@bootcamp/coding-harness/rules/tasks";
import { Terminal } from "../agent/agent";
import type { Answer } from "../rules/answers";

// The real model on fresh copies of vercel/ms, driven through the same Terminal the screens read.
// Runs in `bun run proof`. The metric on the learner page: a yes lets the fix through and the check
// goes green; a no is kept, so nothing changes; Esc ends the run as stopped, and every run is saved.

const folders: string[] = [];
afterAll(() => Promise.all(folders.map((folder) => rm(folder, { recursive: true, force: true }))));

// Plays the person at the keyboard: each prompt that opens gets the same answer.
async function practice(answer: Answer, onTool?: (terminal: Terminal) => void) {
  const task = findTask("months");
  const place = await prepare(task, `proof-terminal-${crypto.randomUUID().slice(0, 8)}`);
  folders.push(place.repo);
  const terminal = new Terminal(place.name);
  let asked = 0;
  let seen: unknown = null;
  terminal.subscribe(() => {
    const screen = terminal.snapshot();
    if (screen.asking && screen.asking !== seen) {
      seen = screen.asking;
      asked++;
      queueMicrotask(() => terminal.answer(answer));
    }
    if (onTool && screen.items.some((item) => item.text.startsWith("✓"))) onTool(terminal);
  });
  await terminal.run(task.task, place, CHECK_COMMAND);
  const session = terminal.snapshot().session;
  if (!session) throw new Error("the run saved no session file");
  const summary = summarize(readSession(await readText(session)));
  return { summary, asked, repo: place.repo, terminal };
}

test("yes to each prompt: the fix goes through and the check passes", async () => {
  const { summary, asked, repo } = await practice("always");
  expect(asked).toBeGreaterThan(0);
  expect(summary.outcome).toBe("passed");
  expect((await runCheck(CHECK_COMMAND, repo)).passed).toBe(true);
  console.log(`yes: ${summary.steps} steps, ${asked} prompts, $${summary.cost.toFixed(4)}`);
}, 600_000);

test("no to each prompt: the agent changes nothing and the refusals are yours", async () => {
  const { summary, terminal } = await practice("deny");
  expect(summary.outcome).not.toBe("passed");
  expect(summary.diff.trim()).toBe("");
  expect(summary.blocked).toBeGreaterThan(0);
  const noes = terminal.snapshot().items.filter((item) => item.text.endsWith("you said no"));
  expect(noes.length).toBe(summary.blocked);
  console.log(`no: ${summary.outcome}, ${summary.blocked} refused, $${summary.cost.toFixed(4)}`);
}, 600_000);

test("Esc after the first tool ends the run as stopped, and the run is still saved", async () => {
  const { summary } = await practice("always", (terminal) => terminal.stop());
  expect(summary.outcome).toBe("stopped");
  expect(summary.reason).toBe("You stopped the run.");
  console.log(`stop: after ${summary.steps} steps, $${summary.cost.toFixed(4)}`);
}, 600_000);
