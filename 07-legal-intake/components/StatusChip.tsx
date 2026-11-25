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

const TONE: Record<Status, string> = {
  assessing: "status-wait",
  "needs review": "status-wait",
  drafting: "status-wait",
  "letter ready": "status-wait",
  sending: "status-wait",
  answered: "status-pass",
  failed: "status-fail",
};

export function StatusChip({ status }: { status: Status }) {
  return <span className={`status ${TONE[status]}`}>{LABEL[status]}</span>;
}

// The steps that run on their own. While a request is in one, its page reloads itself.
export const RUNNING: Status[] = ["assessing", "drafting", "sending"];
