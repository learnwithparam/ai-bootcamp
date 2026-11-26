import { OUTCOME_LABEL } from "../rules/labels";
import { type ReviewState, STATE_LABEL } from "../rules/review";
import type { Check, Outcome } from "../rules/session";

const OUTCOME_TONE: Record<Outcome, string> = {
  passed: "pill-pass",
  no_change: "pill-wait",
  check_failed: "pill-fail",
  stopped: "pill-fail",
  out_of_steps: "pill-wait",
};

const STATE_TONE: Record<ReviewState, string> = {
  waiting: "pill-info",
  approved: "pill-pass",
  changes_requested: "pill-wait",
};

export function OutcomeChip({ outcome }: { outcome: Outcome }) {
  return <span className={`pill ${OUTCOME_TONE[outcome]}`}>{OUTCOME_LABEL[outcome]}</span>;
}

export function StateChip({ state }: { state: ReviewState }) {
  return <span className={`pill ${STATE_TONE[state]}`}>{STATE_LABEL[state]}</span>;
}

// "11 failing, then 0": the check before the agent touched anything, and after it stopped.
export function CheckMove({ before, after }: { before: Check | null; after: Check | null }) {
  if (!before || !after) return <span className="cell-sub">No check</span>;
  return (
    <span className="check-move">
      <span className={before.fail ? "check-count check-fail" : "check-count"}>{before.fail} failing</span>
      <span aria-hidden="true">to</span>
      <span className={after.fail ? "check-count check-fail" : "check-count check-pass"}>{after.fail}</span>
    </span>
  );
}
