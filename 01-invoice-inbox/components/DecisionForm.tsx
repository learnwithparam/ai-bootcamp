"use client";

import { useActionState } from "react";

export type DecisionState = { error: string };
type Decide = (previous: DecisionState, form: FormData) => Promise<DecisionState>;

// The person's call on an exception. Both choices need a note, which is kept with the invoice.
export function DecisionForm({ id, action }: { id: string; action: Decide }) {
  const [state, decide, saving] = useActionState(action, { error: "" });
  return (
    <form action={decide} className="card approval">
      <div className="card-head">Your decision</div>
      <div className="card-body">
        <input type="hidden" name="id" value={id} />
        <label htmlFor="note" className="field-label">
          Why? This note is saved with the invoice.
        </label>
        <textarea
          id="note"
          name="note"
          required
          rows={3}
          className="field"
          placeholder="For example: the supplier agreed to credit the discount on the next invoice."
        />
        {state.error ? (
          <p className="upload-failed" role="alert">
            {state.error}
          </p>
        ) : null}
        <Choices saving={saving} />
      </div>
    </form>
  );
}

function Choices({ saving }: { saving: boolean }) {
  return (
    <div className="approval-actions">
      <button
        type="submit"
        name="decision"
        value="approved"
        className="button button-primary"
        disabled={saving}
      >
        Approve for payment
      </button>
      <button type="submit" name="decision" value="rejected" className="button" disabled={saving}>
        Reject to supplier
      </button>
    </div>
  );
}
