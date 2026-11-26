import type { Status } from "../rules/intake";

const LABEL: Record<Status, string> = {
  assessing: "Reading",
  "needs review": "Needs a decision",
  drafting: "Drafting letter",
  "letter ready": "Letter to approve",
  sending: "Saving letter",
  answered: "Answered",
  failed: "Failed",
};

// Yellow while the agent works, amber while it waits for a lawyer.
const TONE: Record<Status, string> = {
  assessing: "pill-agent",
  "needs review": "pill-wait",
  drafting: "pill-agent",
  "letter ready": "pill-wait",
  sending: "pill-agent",
  answered: "pill-pass",
  failed: "pill-fail",
};

export function StatusChip({ status }: { status: Status }) {
  return <span className={`pill ${TONE[status]}`}>{LABEL[status]}</span>;
}

// The steps that run on their own. While a request is in one, its page reloads itself.
export const RUNNING: Status[] = ["assessing", "drafting", "sending"];
