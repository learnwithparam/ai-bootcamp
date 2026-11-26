import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Client secrets and people's tokens are stored sealed with AES-256-GCM. Someone who reads a database backup
// gets nothing they can use. The key comes from the sign-in secret, so there is no extra setting to lose.

function key(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set. Run `bun run setup` from the repo root.");
  return createHash("sha256").update(`team-workspace-seal:${secret}`).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

// Throws when the text was changed or sealed with another key. A tampered token is never used.
export function open(sealed: string): string {
  const raw = Buffer.from(sealed, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}
