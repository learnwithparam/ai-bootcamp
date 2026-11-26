import type { Readable } from "node:stream";
import { pageText } from "../rules/page-text";
import { isPublicUrl } from "../rules/public-url";
import { type Opened, openUrl } from "./open-url";

// Opens one cited page and returns its visible words, or null when it cannot be read.
// null is not an error for the report: the claim is marked "page could not be read" and left out.

export const LIMIT_BYTES = 3_000_000;
const MAX_REDIRECTS = 5;

// Tests serve pages from this machine, so they name the one host they trust. Nothing else private is opened.
export type ReadOptions = { trustedHost?: string; timeoutMs?: number };

// Follows redirects one at a time, so a public page cannot send the server on to a private address.
async function openPublic(url: string, options: ReadOptions): Promise<Opened | null> {
  let next = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const trusted = new URL(next).hostname === options.trustedHost;
    if (!trusted && !isPublicUrl(next)) {
      console.warn(`Refused to open ${next}: it is not a public web address.`);
      return null;
    }
    const opened = await openUrl(next, options.trustedHost, options.timeoutMs ?? 10_000);
    const location = opened.headers.location;
    if (opened.status < 300 || opened.status >= 400 || !location) return opened;
    opened.body.resume();
    next = new URL(location, next).toString();
  }
  return null;
}

// Reads at most LIMIT_BYTES, then stops, so a huge or endless page cannot fill the server's memory.
export async function readLimited(body: Readable): Promise<string> {
  const parts: Buffer[] = [];
  let size = 0;
  for await (const part of body) {
    parts.push(part as Buffer);
    size += (part as Buffer).byteLength;
    if (size >= LIMIT_BYTES) break;
  }
  body.destroy();
  return Buffer.concat(parts).subarray(0, LIMIT_BYTES).toString("utf8");
}

export async function readPage(url: string, options: ReadOptions = {}): Promise<string | null> {
  try {
    const opened = await openPublic(url, options);
    if (!opened) return null;
    const ok =
      opened.status >= 200 &&
      opened.status < 300 &&
      /text\/(html|plain)/.test(opened.headers["content-type"] ?? "");
    if (!ok || Number(opened.headers["content-length"] ?? 0) > LIMIT_BYTES * 4) {
      opened.body.destroy();
      return null;
    }
    return pageText(await readLimited(opened.body));
  } catch (error) {
    console.error(`Could not read ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
