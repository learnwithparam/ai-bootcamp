import { ACTIVE, CLOSED, type InboxRow, type Status } from "./run";

// The firm's intake desk. An intake assistant runs the agent on client emails, and stops or takes over a run.
// Only the intake lead approves a run that waits, because approving sends a request the agent was not sure of.

export type Role = "assistant" | "lead";
export type Action = "start" | "stop" | "take_over" | "approve";

export const ROLES: Role[] = ["assistant", "lead"];
export const ROLE_LABEL: Record<Role, string> = { assistant: "Intake assistant", lead: "Intake lead" };

export function may(role: Role, action: Action): boolean {
  return action !== "approve" || role === "lead";
}

export const isRole = (value: string | undefined): value is Role => ROLES.includes(value as Role);

// The inbox's views, each a set of emails by the status of their latest run.
export const VIEWS = {
  inbox: "Inbox",
  approvals: "Needs approval",
  working: "Agent working",
  sent: "Sent",
  closed: "Closed",
} as const;
export type View = keyof typeof VIEWS;

export function viewOf(value: string | undefined): View {
  return value && value in VIEWS ? (value as View) : "inbox";
}

export function viewOfStatus(status: Status | null): View {
  if (status === null) return "inbox";
  if (status === "waiting") return "approvals";
  if (status === "submitted") return "sent";
  if (CLOSED.includes(status)) return "closed";
  if (ACTIVE.includes(status)) return "working";
  return "inbox";
}

export function inView(rows: InboxRow[], view: View): InboxRow[] {
  return rows.filter((row) => viewOfStatus(row.status) === view);
}

export function counts(rows: InboxRow[]): Record<View, number> {
  const all = Object.keys(VIEWS) as View[];
  return Object.fromEntries(all.map((view) => [view, inView(rows, view).length])) as Record<View, number>;
}
