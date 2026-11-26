/** @jsxImportSource @opentui/react */
import { basename, resolve } from "node:path";
import { CHECK_COMMAND } from "@bootcamp/coding-harness/rules/tasks";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Terminal } from "../agent/agent";
import { App } from "./App";

// The coding agent as a terminal app. From the repo root:
//   bun run terminal                       then /practice months to try a real task
//   bun run terminal --repo ../my-app      to give it tasks in your own git repo
//   bun run terminal --repo . --check "bun test"

function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const repoOption = option("--repo");
const start = { repo: repoOption ? resolve(repoOption) : null, check: option("--check") ?? CHECK_COMMAND };
const terminal = new Terminal(start.repo ? basename(start.repo) : "");
const renderer = await createCliRenderer({ exitOnCtrlC: false });

function quit(): void {
  renderer.destroy();
  process.exit(0);
}

terminal.note(
  "quiet",
  "Type a task for your repo, or /practice months to watch a real fix. /help shows the commands.",
);
createRoot(renderer).render(<App terminal={terminal} start={start} quit={quit} />);
