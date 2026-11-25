// The sales team shares one accounts table. Everyone sees every row and its research.
// A rep adds accounts, which become theirs, and takes an account nobody owns.
// The sales lead adds accounts for the team and gives any account to anyone.

export type Role = "rep" | "lead";
export type Action = "add" | "take" | "assign";

export const ROLE_LABEL: Record<Role, string> = { rep: "Account executive", lead: "Sales lead" };

export function may(role: Role, action: Action, account?: { ownerId: string | null }): boolean {
  if (action === "add") return true;
  if (action === "assign") return role === "lead";
  return account !== undefined && account.ownerId === null;
}

// Who owns a new account: a rep's own adds are theirs, the lead's wait in Unassigned.
export function ownerOfNew(role: Role, userId: string): string | null {
  return role === "rep" ? userId : null;
}

export const VIEWS = {
  all: "All accounts",
  mine: "My accounts",
  unassigned: "Unassigned",
} as const;

export type View = keyof typeof VIEWS;

export function viewOf(value: string | undefined): View {
  return value === "mine" || value === "unassigned" ? value : "all";
}

// Someone on the sales team, as the owner column and the Assign menu show them.
export type Person = { id: string; name: string; email: string; createdAt: Date };
