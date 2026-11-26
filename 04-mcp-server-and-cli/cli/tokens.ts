import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// Where `login` keeps your tokens: in your home folder, readable only by you (mode 0600).
const FOLDER = join(homedir(), ".config", "learnwithparam");
const FILE = join(FOLDER, "tokens.json");

export type Tokens = {
  server: string;
  clientId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export async function readTokens(): Promise<Tokens | null> {
  const text = await readFile(FILE, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return text ? (JSON.parse(text) as Tokens) : null;
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  await mkdir(FOLDER, { recursive: true, mode: 0o700 });
  await writeFile(FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  await chmod(FILE, 0o600);
}

export async function forgetTokens(): Promise<void> {
  await rm(FILE, { force: true });
}
