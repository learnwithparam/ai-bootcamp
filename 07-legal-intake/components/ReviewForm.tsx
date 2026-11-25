"use client";

import { useActionState } from "react";

export type ActionState = { error?: string };
export type Answer = (previous: ActionState, form: FormData) => Promise<ActionState>;

function ErrorLine({ error }: ActionState) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}

// The first pause: accept or decline. When the check found a possible match, the lawyer must clear it first.
// locked: a paralegal sees the form, but only a lawyer can press it.
type DecisionProps = { id: string; action: Answer; possible: boolean; locked: boolean };

function DecisionButtons({ disabled }: { disabled: boolean }) {
  return (
    <div className="review-actions">
      <button
        type="submit"
        name="choice"
        value="accept"
        className="button button-primary"
        disabled={disabled}
      >
        Accept the matter
      </button>
      <button type="submit" name="choice" value="decline" className="button" disabled={disabled}>
        Decline
      </button>
    </div>
  );
}

export function DecisionForm({ id, action, possible, locked }: DecisionProps) {
  const [state, send, sending] = useActionState(action, {});
  return (
    <form action={send} className="review-form">
      {locked ? <p className="form-hint">Only a lawyer can accept or decline a matter.</p> : null}
      <input type="hidden" name="id" value={id} />
      <label className="field-label">
        Note for the letter (optional)
        <textarea name="note" className="field" rows={3} maxLength={1000} />
      </label>
      {possible ? (
        <label className="check-line">
          <input type="checkbox" name="cleared" /> I checked each possible conflict: they are different people
          or companies.
        </label>
      ) : null}
      <DecisionButtons disabled={sending || locked} />
      <ErrorLine error={state.error} />
    </form>
  );
}

// The second pause: the lawyer edits the draft. What they approve is exactly what the client reads.
type LetterProps = { id: string; draft: string; action: Answer; locked: boolean };

export function LetterForm({ id, draft, action, locked }: LetterProps) {
  const [state, send, sending] = useActionState(action, {});
  return (
    <form action={send} className="review-form">
      <input type="hidden" name="id" value={id} />
      <label className="field-label">
        Letter to the client
        <span>Drafted by the assistant from the decision. Edit anything, then approve.</span>
        <textarea
          name="letter"
          className="field letter-field agent-filled"
          rows={16}
          defaultValue={draft}
          readOnly={locked}
        />
      </label>
      <div className="review-actions">
        {locked ? <span className="form-hint">Only a lawyer can approve a letter.</span> : null}
        <button type="submit" className="button button-primary" disabled={sending || locked}>
          {sending ? "Saving..." : "Approve and send"}
        </button>
      </div>
      <ErrorLine error={state.error} />
    </form>
  );
}

// A step that failed can run again from where it stopped. Nothing before it runs twice.
export function RetryForm({ id, action }: { id: string; action: Answer }) {
  const [state, send, sending] = useActionState(action, {});
  return (
    <form action={send} className="review-actions">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="button" disabled={sending}>
        Try again
      </button>
      <ErrorLine error={state.error} />
    </form>
  );
}
