import { lookup } from "node:dns/promises";
import { pageText } from "../rules/page-text";
import { isPublicIp, isPublicUrl } from "../rules/public-url";

// Opens one cited page and returns its visible words, or null when it cannot be read.
// null is not an error for the report: the claim is marked "page could not be read" and left out.

export const LIMIT_BYTES = 3_000_000;
const MAX_REDIRECTS = 5;

// Tests serve pages from this machine, so they name the one host they trust. Nothing else private is opened.
export type ReadOptions = { trustedHost?: string; timeoutMs?: number };

// The address as written, then every address its name resolves to, must be public.
async function mayOpen(url: string, options: ReadOptions): Promise<boolean> {
  const host = new URL(url).hostname;
  if (options.trustedHost !== undefined && host === options.trustedHost) return true;
  if (!isPublicUrl(url)) return false;
  const addresses = await lookup(host.replace(/^\[|\]$/g, ""), { all: true });
  return addresses.length > 0 && addresses.every((found) => isPublicIp(found.address));
}

// Follows redirects one at a time, so a public page cannot send the server on to a private address.
async function fetchPublic(url: string, options: ReadOptions): Promise<Response | null> {
  let next = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await mayOpen(next, options))) {
      console.warn(`Refused to open ${next}: it is not a public web address.`);
      return null;
    }
    const response = await fetch(next, {
      headers: { "user-agent": "learnwithparam-research-agent/1.0", accept: "text/html,text/plain" },
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) return response;
    next = new URL(location, next).toString();
  }
  return null;
}

// Reads at most LIMIT_BYTES, then stops, so a huge or endless page cannot fill the server's memory.
export async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const parts: Uint8Array[] = [];
  let size = 0;
  while (size < LIMIT_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    size += value.byteLength;
  }
  await reader.cancel();
  return new TextDecoder().decode(Buffer.concat(parts).subarray(0, LIMIT_BYTES));
}

export async function readPage(url: string, options: ReadOptions = {}): Promise<string | null> {
  try {
    const response = await fetchPublic(url, options);
    const type = response?.headers.get("content-type") ?? "";
    if (!response?.ok || !/text\/(html|plain)/.test(type)) return null;
    if (Number(response.headers.get("content-length") ?? 0) > LIMIT_BYTES * 4) return null;
    return pageText(await readLimited(response));
  } catch (error) {
    console.error(`Could not read ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
