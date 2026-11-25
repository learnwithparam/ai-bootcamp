"use client";

import { useActionState } from "react";
import { STORY_MAX, STORY_MIN } from "../rules/form";

export type FormState = { error?: string };
type Send = (previous: FormState, form: FormData) => Promise<FormState>;

function ContactFields() {
  return (
    <>
      <label className="field-label">
        Your full name
        <input
          name="clientName"
          className="field"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
        />
      </label>
      <label className="field-label">
        Email for our reply
        <input
          name="clientEmail"
          type="email"
          className="field"
          required
          maxLength={200}
          autoComplete="email"
        />
      </label>
    </>
  );
}

function StoryFields() {
  return (
    <>
      <label className="field-label">
        Who is on the other side?
        <span>People or companies, separated by commas. For example your landlord or employer.</span>
        <input name="otherParties" className="field" maxLength={600} />
      </label>
      <label className="field-label">
        What happened?
        <span>Dates, names and what you want to happen. Mention any deadline you have been given.</span>
        <textarea
          name="story"
          className="field"
          rows={9}
          required
          minLength={STORY_MIN}
          maxLength={STORY_MAX}
        />
      </label>
    </>
  );
}

// The public request form. No account: the client gets a private link to follow their request.
export function IntakeForm({ action }: { action: Send }) {
  const [state, send, sending] = useActionState(action, {});
  return (
    <form action={send} className="intake-form">
      <ContactFields />
      <StoryFields />
      <button type="submit" className="button button-primary" disabled={sending}>
        {sending ? "Sending..." : "Send request"}
      </button>
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
