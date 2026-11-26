import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { HOME } from "../agent/workspace";

// The CLI signs in to the review site the way the browser does, and keeps the session cookie in a file
// only you can read (mode 0600). Your password is sent once and never saved.

export const SITE = process.env.CODING_AGENT_SITE ?? "http://localhost:3110";
const FILE = join(HOME, "account.json");
const COOKIE = "better-auth.session_token";

export type Account = { site: string; email: string; cookie: string };

export async function readAccount(): Promise<Account | null> {
  const text = await readFile(FILE, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return text ? (JSON.parse(text) as Account) : null;
}

function sessionCookie(response: Response): string | null {
  const found = response.headers.getSetCookie().find((each) => each.startsWith(`${COOKIE}=`));
  return found ? (found.split(";")[0] ?? null) : null;
}

export async function signIn(email: string, password: string): Promise<Account> {
  const response = await fetch(`${SITE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: SITE },
    body: JSON.stringify({ email, password }),
  }).catch(() => {
    throw new Error(`Could not reach ${SITE}. Start the review site with: bun run dev coding-agent`);
  });
  if (response.status === 401) throw new Error("That email and password do not match an account.");
  if (!response.ok) throw new Error(`Sign-in failed with status ${response.status}.`);
  const cookie = sessionCookie(response);
  if (!cookie) throw new Error("The site did not return a session. Is it the coding agent's review site?");
  const account = { site: SITE, email, cookie };
  await mkdir(HOME, { recursive: true, mode: 0o700 });
  await writeFile(FILE, JSON.stringify(account, null, 2), { mode: 0o600 });
  await chmod(FILE, 0o600);
  return account;
}

export async function signOut(): Promise<void> {
  await rm(FILE, { force: true });
}
