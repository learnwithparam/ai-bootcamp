import type { Deadline, Intake, Status } from "./intake";

// How the firm sees its requests: who may do what, the board's tabs, and which deadlines are close.

export type Role = "lawyer" | "paralegal";

// A paralegal triages and chases, but only a lawyer takes on a client or sends a letter.
export function canDecide(role: Role): boolean {
  return role === "lawyer";
}

export const TABS: { key: string; label: string; statuses: Status[] }[] = [
  {
    key: "open",
    label: "Open",
    statuses: ["assessing", "needs review", "drafting", "letter ready", "sending"],
  },
  { key: "decide", label: "Needs a decision", statuses: ["needs review"] },
  { key: "letters", label: "Letters to approve", statuses: ["letter ready"] },
  { key: "answered", label: "Answered", statuses: ["answered"] },
  { key: "failed", label: "Failed", statuses: ["failed"] },
];

export function tabFor(key: string | undefined) {
  return TABS.find((tab) => tab.key === key) ?? (TABS[0] as (typeof TABS)[number]);
}

// The date the client confirmed in the form wins over one the model read in the story.
export function deadlineOf(intake: Pick<Intake, "keyDate" | "assessment">): Deadline | null {
  return intake.keyDate ?? intake.assessment?.deadline ?? null;
}

export function daysLeft(date: string, today: Date): number {
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((Date.parse(`${date}T00:00:00Z`) - start) / 86_400_000);
}

export type Urgency = "overdue" | "this week" | "later";

export function urgency(date: string, today: Date): Urgency {
  const days = daysLeft(date, today);
  if (days < 0) return "overdue";
  return days <= 7 ? "this week" : "later";
}

// The board puts the closest deadline first, then the newest request.
export function byDeadline(today: Date) {
  const key = (intake: Intake) => {
    const deadline = deadlineOf(intake);
    return deadline ? daysLeft(deadline.date, today) : Number.POSITIVE_INFINITY;
  };
  return (a: Intake, b: Intake) => key(a) - key(b) || b.createdAt.getTime() - a.createdAt.getTime();
}

// The five steps of the graph, and where one request stands in them. The matter page draws this.
export const STEPS = [
  { node: "assess", label: "Read the request", human: false },
  { node: "checkConflicts", label: "Check conflicts", human: false },
  { node: "lawyerReview", label: "Lawyer decides", human: true },
  { node: "writeLetter", label: "Draft the letter", human: false },
  { node: "approveLetter", label: "Lawyer approves", human: true },
] as const;

const AT: Record<Status, number> = {
  assessing: 0,
  "needs review": 2,
  drafting: 3,
  "letter ready": 4,
  sending: 4,
  answered: 5,
  failed: -1,
};

export type StepState = "done" | "now" | "later";

// failed has no place of its own: the step after the last saved result is the one that failed.
export function stepStates(status: Status, hasDecision: boolean, hasAssessment: boolean): StepState[] {
  const at = status === "failed" ? (hasDecision ? 3 : hasAssessment ? 2 : 0) : AT[status];
  return STEPS.map((_, index) => (index < at ? "done" : index === at ? "now" : "later"));
}
