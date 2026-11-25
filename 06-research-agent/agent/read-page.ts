import { pageText } from "../rules/page-text";
import { isPublicUrl } from "../rules/public-url";

// Opens one cited page and returns its visible words, or null when it cannot be read.
// null is not an error for the report: the claim is marked "page could not be read" and left out.

const LIMIT_BYTES = 3_000_000;
const MAX_REDIRECTS = 5;

// Tests serve pages from this machine, so they name the one host they trust. Nothing else private is opened.
export type ReadOptions = { trustedHost?: string; timeoutMs?: number };

// Follows redirects one at a time, so a public page cannot send the server on to a private address.
async function fetchPublic(url: string, options: ReadOptions): Promise<Response | null> {
  let next = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const trusted = options.trustedHost !== undefined && new URL(next).hostname === options.trustedHost;
    if (!trusted && !isPublicUrl(next)) {
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

export async function readPage(url: string, options: ReadOptions = {}): Promise<string | null> {
  try {
    const response = await fetchPublic(url, options);
    const type = response?.headers.get("content-type") ?? "";
    if (!response?.ok || !/text\/(html|plain)/.test(type)) return null;
    const body = await response.text();
    return pageText(body.slice(0, LIMIT_BYTES));
  } catch (error) {
    console.error(`Could not read ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
