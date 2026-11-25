"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { RUNNING_AT_ONCE } from "../rules/limits";

export type AddState = { error?: string; added?: number };
type Add = (previous: AddState, form: FormData) => Promise<AddState>;

// Paste a few companies, one per line. Each becomes a row, and its cells fill in as the research lands.
export function AddAccounts({ action, owned }: { action: Add; owned: boolean }) {
  const [state, add, adding] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.added) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={add} className="add-accounts">
      <label htmlFor="companies">
        Add accounts
        <span className="form-hint">
          Up to {RUNNING_AT_ONCE} names or websites, one per line.{" "}
          {owned ? "They are yours." : "They go to Unassigned."}
        </span>
      </label>
      <textarea
        id="companies"
        name="companies"
        className="field"
        rows={3}
        required
        placeholder={"Linear\nposthog.com"}
        aria-describedby="add-result"
      />
      <button type="submit" className="button button-primary" disabled={adding}>
        <Plus aria-hidden="true" /> {adding ? "Adding..." : "Research"}
      </button>
      <p id="add-result" className={state.error ? "form-error" : "form-hint"} role="status">
        {state.error ??
          (state.added ? `Researching ${state.added} new account${state.added === 1 ? "" : "s"}.` : "")}
      </p>
    </form>
  );
}
