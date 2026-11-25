import { type CheckedClaim, type CheckResult, type Claim, quoteIsOnPage } from "../../rules/claims";
import { type ReadOptions, readPage } from "../read-page";

// No model here. Each cited page is opened once, and each claim's quote is looked for on it.
export async function checkClaims(claims: Claim[], options: ReadOptions = {}): Promise<CheckedClaim[]> {
  const urls = [...new Set(claims.map((claim) => claim.sourceUrl))];
  const pages = new Map(
    await Promise.all(urls.map(async (url) => [url, await readPage(url, options)] as const)),
  );
  return claims.map((claim) => {
    const text = pages.get(claim.sourceUrl);
    const check: CheckResult =
      text == null ? "unreadable" : quoteIsOnPage(claim.quote, text) ? "found" : "missing";
    return { ...claim, check };
  });
}
