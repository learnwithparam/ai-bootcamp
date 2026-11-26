import { readAccount, signIn, signOut } from "@bootcamp/coding-harness/agent/account";
import { upload } from "@bootcamp/coding-harness/agent/upload";
import { ownRepo, prepare } from "@bootcamp/coding-harness/agent/workspace";
import { CHECK_COMMAND, findTask } from "@bootcamp/coding-harness/rules/tasks";
import { HELP, readTyped } from "../rules/commands";
import type { Terminal } from "./agent";

// What happens when you press Enter in the input box. The sign-in and upload are the same ones
// `bun run code` uses, so a run made here shows up on product 10's review site.

export type Start = { repo: string | null; check: string };

let email = "";

// While /login is asking, Enter answers the question instead of running a command.
async function answerPrompt(terminal: Terminal, line: string): Promise<void> {
  const prompt = terminal.snapshot().prompt;
  if (prompt?.hidden) {
    terminal.set({ prompt: null });
    const account = await signIn(email, line);
    return terminal.note("pass", `Signed in to ${account.site} as ${account.email}.`);
  }
  email = line.trim();
  terminal.set({ prompt: { label: "Password", hidden: true } });
}

async function practice(terminal: Terminal, slug: string): Promise<void> {
  const task = findTask(slug);
  terminal.note("quiet", `Making a fresh copy of vercel/ms for "${task.title}"...`);
  const place = await prepare(task, `${task.slug}-${Date.now()}`);
  await terminal.run(task.task, place, CHECK_COMMAND);
}

async function ownTask(terminal: Terminal, task: string, start: Start): Promise<void> {
  if (!start.repo)
    return terminal.note(
      "wait",
      "No repo to work in. Try /practice months, or start in your own repo: bun run terminal --repo <path>",
    );
  await terminal.run(task, await ownRepo(start.repo), start.check);
}

async function sendForReview(terminal: Terminal): Promise<void> {
  const url = await upload(terminal.snapshot().session ?? undefined);
  terminal.note("pass", `Uploaded. Open it at ${url}`);
}

async function command(terminal: Terminal, line: string, start: Start, quit: () => void): Promise<void> {
  const typed = readTyped(line);
  if (!typed) return;
  if (typed.kind !== "clear") terminal.note("you", `> ${line.trim()}`);
  if (typed.kind === "task") return ownTask(terminal, typed.task, start);
  if (typed.kind === "practice") return practice(terminal, typed.slug);
  if (typed.kind === "upload") return sendForReview(terminal);
  if (typed.kind === "help") return terminal.note("quiet", HELP);
  if (typed.kind === "unknown") return terminal.note("wait", typed.message);
  if (typed.kind === "clear") return terminal.set({ items: [] });
  if (typed.kind === "exit") return quit();
  if (typed.kind === "logout") {
    await signOut();
    return terminal.note("quiet", "Signed out.");
  }
  const account = await readAccount();
  if (account) terminal.note("quiet", `You are signed in as ${account.email}. /logout first to switch.`);
  else terminal.set({ prompt: { label: "Email", hidden: false } });
}

// A failure shows on screen in words, and the app keeps running.
export async function submit(
  terminal: Terminal,
  line: string,
  start: Start,
  quit: () => void,
): Promise<void> {
  const work = terminal.snapshot().prompt
    ? answerPrompt(terminal, line)
    : command(terminal, line, start, quit);
  await work.catch((error: Error) => {
    console.error(error);
    terminal.set({ prompt: null });
    terminal.note("fail", error.message);
  });
}
