import { type Role, VERDICT_LABEL } from "../rules/review";
import type { RunDetail } from "../rules/run";
import { StateChip } from "./Chips";
import { ReviewForm } from "./ReviewForm";
import { when } from "./when";

type Person = { id: string; role: Role };

// Who may review is decided again on the server. This only hides the form from people who cannot use it.
function formFor(person: Person, run: RunDetail) {
  if (person.role !== "reviewer")
    return <p className="cell-sub">Reviewers on the team approve runs or ask for changes.</p>;
  if (person.id === run.userId)
    return <p className="cell-sub">You ran this one, so someone else reviews it.</p>;
  return <ReviewForm runId={run.id} canApprove={run.outcome === "passed" && run.filesChanged > 0} />;
}

export function ReviewPanel({ person, run }: { person: Person; run: RunDetail }) {
  return (
    <aside className="panel review-panel" aria-label="Review">
      <div className="panel-head">
        <h2>Review</h2>
        <StateChip state={run.state} />
      </div>
      <div className="panel-body">
        {run.reviews.length > 0 && (
          <ol className="timeline">
            {run.reviews.map((review) => (
              <li key={review.id}>
                <strong>{review.reviewer}</strong> {VERDICT_LABEL[review.verdict].toLowerCase()}
                <time dateTime={review.createdAt.toISOString()}>{when(review.createdAt)}</time>
                {review.note && <p className="review-note">{review.note}</p>}
              </li>
            ))}
          </ol>
        )}
        {formFor(person, run)}
      </div>
    </aside>
  );
}
