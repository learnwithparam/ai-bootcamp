// A claim is one sentence about the company, the page it came from, and words copied from that page.
// The model writes claims. This file decides which ones the report may keep.

export type Claim = { id: string; topic: string; text: string; sourceUrl: string; quote: string };

// found: the quote is on the page. missing: the page loaded and the quote is not on it.
// unreadable: the page did not load, so nothing can be said either way.
export type CheckResult = "found" | "missing" | "unreadable";

export type CheckedClaim = Claim & { check: CheckResult };

// Short quotes match by chance ("founded in 2019"), so a quote must carry real words.
export const MIN_QUOTE_LENGTH = 20;

// Pages differ from what a model copies in spacing, curly quotes, dashes and case. Both sides are flattened the same way.
export function flatten(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Words in separate parts of a page ("Learn more" then an arrow) gain or lose spaces when copied,
// and pages hide invisible joining characters. So both sides are compared with no spacing at all.
const squash = (text: string) => flatten(text).replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, "");

export function quoteIsOnPage(quote: string, pageText: string): boolean {
  const wanted = flatten(quote).replace(/^["'.\s]+|["'.\s]+$/g, "");
  if (wanted.length < MIN_QUOTE_LENGTH) return false;
  return squash(pageText).includes(squash(wanted));
}

// Only a quote found on its page reaches the report and the score.
export function keptClaims(claims: CheckedClaim[]): CheckedClaim[] {
  return claims.filter((claim) => claim.check === "found");
}

// Links from search often carry tracking, such as ?utm_source=openai. Two links to the same page count once.
export function cleanUrl(url: string): string {
  const parsed = new URL(url);
  for (const name of [...parsed.searchParams.keys()]) {
    if (name.startsWith("utm_")) parsed.searchParams.delete(name);
  }
  parsed.hash = "";
  return parsed.toString();
}

// Web search adds its own citations to what the model writes, such as "([site](https://...))".
// The report shows each claim's source itself, so those are taken out of the text.
export function withoutCitations(text: string): string {
  return text
    .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();
}
