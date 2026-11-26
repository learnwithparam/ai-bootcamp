// Each account researched runs several web searches, so it costs real money (about $0.12 on the default model).
// One person may have a few running at once and a few more each day. The page says which limit was hit.

export const RUNNING_AT_ONCE = 5;
export const REPORTS_PER_DAY = 15;

// Returns why these new accounts may not start, or null when they all may.
export function whyNotStart(runningNow: number, startedToday: number, asked = 1): string | null {
  if (runningNow + asked > RUNNING_AT_ONCE)
    return runningNow === 0
      ? `Add up to ${RUNNING_AT_ONCE} accounts at a time.`
      : `${runningNow} of your accounts are still being researched. You can add ${Math.max(0, RUNNING_AT_ONCE - runningNow)} more now.`;
  if (startedToday + asked > REPORTS_PER_DAY)
    return `You can research ${REPORTS_PER_DAY} accounts a day, and ${Math.max(0, REPORTS_PER_DAY - startedToday)} are left today.`;
  return null;
}

// One company per line, or separated by commas. Repeats count once, and blank lines are skipped.
export function companiesFrom(typed: string): string[] {
  const all = typed
    .split(/[\n,]+/)
    .map(companyQuery)
    .filter((name): name is string => name !== null);
  return all.filter(
    (name, index) => all.findIndex((other) => other.toLowerCase() === name.toLowerCase()) === index,
  );
}

// What the person typed, tidied. Too short or too long is refused before any search runs.
export function companyQuery(typed: string): string | null {
  const company = typed.replace(/\s+/g, " ").trim();
  if (company.length < 2 || company.length > 100) return null;
  return company;
}
