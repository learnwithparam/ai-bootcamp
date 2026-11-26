import { readSession } from "@bootcamp/coding-harness/rules/session";
import { readAccount } from "./account";
import { latestSession, readText } from "./session-file";

// Sends one session file to the review site, where a teammate reads it and approves it or asks for changes.
// The file is checked here first, so a broken file fails on your machine with a clear message.

export async function upload(path?: string): Promise<string> {
  const account = await readAccount();
  if (!account) throw new Error("Sign in first with: bun run code login");
  const file = path ?? (await latestSession());
  const text = await readText(file);
  readSession(text);
  const response = await fetch(`${account.site}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/x-ndjson", cookie: account.cookie, origin: account.site },
    body: text,
  }).catch(() => {
    throw new Error(`Could not reach ${account.site}. Start the review site with: bun run dev coding-agent`);
  });
  const answer = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
  if (response.status === 401) throw new Error("Your sign-in has ended. Run: bun run code login");
  if (!response.ok || !answer.id)
    throw new Error(answer.error ?? `Upload failed with status ${response.status}.`);
  return `${account.site}/runs/${answer.id}`;
}
