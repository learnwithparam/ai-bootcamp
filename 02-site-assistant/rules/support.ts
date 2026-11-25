// Who may read the support queue. SUPPORT_EMAILS is a comma-separated list in the settings file.
// Plain code, no AI, so the check is the same on the page and in the action that marks a ticket answered.

export function supportTeam(setting: string | undefined): Set<string> {
  const emails = (setting ?? "").split(",").map((email) => email.trim().toLowerCase());
  return new Set(emails.filter(Boolean));
}

export function isOnSupportTeam(email: string | undefined, team: Set<string>): boolean {
  return Boolean(email) && team.has((email as string).toLowerCase());
}
