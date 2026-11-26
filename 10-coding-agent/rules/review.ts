// Who may do what on the review site. A developer runs the agent and uploads runs.
// A reviewer reads a run and approves it or asks for changes, the way a pull request is reviewed.

export const ROLES = ["developer", "reviewer"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = { developer: "Developer", reviewer: "Reviewer" };
export const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value);

export const VERDICTS = ["approved", "changes_requested"] as const;
export type Verdict = (typeof VERDICTS)[number];
export const VERDICT_LABEL: Record<Verdict, string> = {
  approved: "Approved",
  changes_requested: "Changes requested",
};

export type ReviewState = Verdict | "waiting";
export const STATE_LABEL: Record<ReviewState, string> = { ...VERDICT_LABEL, waiting: "Waiting for review" };

export const MAX_NOTE = 2000;

type Reviewer = { id: string; role: Role };
type RunToReview = { userId: string; outcome: string; filesChanged: number };

// A run is reviewed by someone other than the person who ran it, and only a reviewer can review.
// A run whose check did not pass, or that changed nothing, can be sent back, but never approved.
export function whyCannotReview(
  person: Reviewer,
  run: RunToReview,
  verdict: Verdict,
  note: string,
): string | null {
  if (person.role !== "reviewer") return "Only a reviewer can review a run.";
  if (person.id === run.userId) return "You ran this one. Someone else reviews it.";
  if (verdict === "approved" && run.outcome !== "passed")
    return "Only a run whose check passed can be approved.";
  if (verdict === "approved" && run.filesChanged === 0)
    return "This run changed no files, so there is nothing to approve.";
  if (verdict === "changes_requested" && !note.trim())
    return "Say what should change, so the developer knows.";
  if (note.length > MAX_NOTE) return `Keep the note under ${MAX_NOTE} characters.`;
  return null;
}

// The views down the side of the review site, in the order a reviewer works through them.
export type View = ReviewState | "all";
export const VIEWS: Record<View, string> = {
  waiting: "Waiting for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  all: "All runs",
};
export const isView = (value: string): value is View => value in VIEWS;
