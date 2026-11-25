"use client";

import { useActionState } from "react";

export type StartState = { error?: string };
type Start = (previous: StartState, form: FormData) => Promise<StartState>;

// Type a company and start a report. The page moves to the report as soon as it is saved.
export function ResearchForm({ action }: { action: Start }) {
  const [state, start, starting] = useActionState(action, {});
  return (
    <form action={start} className="research-form">
      <label htmlFor="company" className="research-label">
        Research a company
        <span>A name or a website, for example Linear or vercel.com. A report takes about a minute.</span>
      </label>
      <input id="company" name="company" className="field" required minLength={2} maxLength={100} />
      <button type="submit" className="button button-primary" disabled={starting}>
        {starting ? "Starting..." : "Research"}
      </button>
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
