import Link from "next/link";
import type { Intake } from "../rules/intake";
import type { Answer } from "./ReviewForm";
import { DecisionForm, RetryForm } from "./ReviewForm";

const WAITING: Partial<Record<Intake["status"], string>> = {
  assessing: "The assistant is reading the request and checking conflicts.",
  drafting: "The assistant is drafting the letter from the decision.",
  "letter ready": "The letter is drafted and waits for a lawyer to approve it.",
  sending: "Saving the approved letter.",
  answered: "Answered. The client can read the letter on their private link.",
};

// The side panel holds the one thing this request waits for. A paralegal sees it locked.
export function ActionPanel(props: {
  intake: Intake;
  locked: boolean;
  tab: string;
  decide: Answer;
  retry: Answer;
}) {
  const { intake, locked } = props;
  const possible = intake.conflicts.some((conflict) => conflict.match === "possible");
  return (
    <aside className="panel matter-actions" aria-label="Next step">
      <h2 className="panel-head">Next step</h2>
      <div className="panel-body">
        {intake.error ? <p className="form-error">{intake.error}</p> : null}
        {intake.status === "needs review" ? (
          <DecisionForm id={intake.id} action={props.decide} possible={possible} locked={locked} />
        ) : null}
        {intake.status === "failed" ? <RetryForm id={intake.id} action={props.retry} /> : null}
        {WAITING[intake.status] ? <p>{WAITING[intake.status]}</p> : null}
        {intake.status === "letter ready" && props.tab !== "letter" ? (
          <Link href={`/queue/${intake.id}?tab=letter`} className="button button-firm">
            Review the letter
          </Link>
        ) : null}
        <p className="form-hint">Assistant cost for this request: ${intake.cost.toFixed(4)}</p>
      </div>
    </aside>
  );
}
