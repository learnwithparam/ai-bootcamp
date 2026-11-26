"use client";

import { useActionState } from "react";
import { type ReviewForm as FormState, sendReview } from "../app/actions";
import { MAX_NOTE } from "../rules/review";

const START: FormState = { error: null, sent: false };

function VerdictChoice({ canApprove }: { canApprove: boolean }) {
  return (
    <>
      <fieldset className="choice-group">
        <legend className="field-label">Your review</legend>
        <label className="choice">
          <input type="radio" name="verdict" value="approved" disabled={!canApprove} required />
          Approve the change
        </label>
        <label className="choice">
          <input type="radio" name="verdict" value="changes_requested" required />
          Ask for changes
        </label>
      </fieldset>
      {!canApprove && (
        <p className="form-hint">Only a run that changed files and passed its check can be approved.</p>
      )}
    </>
  );
}

// Approve, or send it back with a note. Approve is only offered when the run's check passed.
export function ReviewForm({ runId, canApprove }: { runId: string; canApprove: boolean }) {
  const [state, action, pending] = useActionState(sendReview, START);
  return (
    <form action={action} className="review-form" key={state.sent ? "sent" : "open"}>
      <input type="hidden" name="runId" value={runId} />
      <VerdictChoice canApprove={canApprove} />
      <div>
        <label className="field-label" htmlFor="review-note">
          Note for the developer
        </label>
        <textarea
          id="review-note"
          name="note"
          className="field"
          rows={4}
          maxLength={MAX_NOTE}
          placeholder="What should change, or why it is good to merge"
        />
      </div>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.sent && (
        <p className="form-hint" role="status">
          Review sent.
        </p>
      )}
      <button type="submit" className="button button-primary" disabled={pending}>
        {pending ? "Sending" : "Send review"}
      </button>
    </form>
  );
}
