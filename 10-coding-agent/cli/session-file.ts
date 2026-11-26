import { appendFileSync, mkdirSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { SESSIONS } from "../agent/workspace";
import type { SessionEvent } from "../rules/session";

// One session file per run, written a line at a time as the run goes.
// If the run crashes halfway, every step up to the crash is still on disk.

export function newSessionFile(): { id: string; path: string; write: (event: SessionEvent) => void } {
  mkdirSync(SESSIONS, { recursive: true, mode: 0o700 });
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
  const path = join(SESSIONS, `${id}.jsonl`);
  const write = (event: SessionEvent) => appendFileSync(path, `${JSON.stringify(event)}\n`, { mode: 0o600 });
  return { id, path, write };
}

export async function latestSession(): Promise<string> {
  const names = (await readdir(SESSIONS).catch(() => [])).filter((name) => name.endsWith(".jsonl"));
  if (names.length === 0) throw new Error("No runs yet. Start one with: bun run code run <task>");
  const dated = await Promise.all(
    names.map(async (name) => ({ name, at: (await stat(join(SESSIONS, name))).mtimeMs })),
  );
  const newest = dated.sort((first, second) => second.at - first.at)[0];
  return join(SESSIONS, newest?.name ?? "");
}

export const readText = (path: string) => readFile(path, "utf8");
