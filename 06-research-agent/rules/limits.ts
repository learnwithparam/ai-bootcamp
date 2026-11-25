// Each report runs several web searches, so it costs real money (about $0.12 on the default model).
// One account may run one report at a time and a few each day. The page says which limit was hit.

export const RUNNING_AT_ONCE = 1;
export const REPORTS_PER_DAY = 10;

// Returns why a new report may not start, or null when it may.
export function whyNotStart(runningNow: number, startedToday: number): string | null {
  if (runningNow >= RUNNING_AT_ONCE)
    return "A report is still running. Wait for it to finish, then start the next one.";
  if (startedToday >= REPORTS_PER_DAY)
    return `You have run ${REPORTS_PER_DAY} reports today. Come back tomorrow.`;
  return null;
}

// What the person typed, tidied. Too short or too long is refused before any search runs.
export function companyQuery(typed: string): string | null {
  const company = typed.replace(/\s+/g, " ").trim();
  if (company.length < 2 || company.length > 100) return null;
  return company;
}
