"use client";

import { type ReactNode, useActionState } from "react";

export type ActionState = { error?: string };
type Action = (previous: ActionState, form: FormData) => Promise<ActionState>;

const TONE = (props: { primary?: boolean; danger?: boolean }) =>
  props.primary ? "button button-primary" : props.danger ? "button button-danger" : "button";

// One button that runs one server action, and shows its refusal in words when there is one.
export function ActionButton(props: {
  action: Action;
  name: string;
  value: string;
  label: string;
  primary?: boolean;
  danger?: boolean;
  icon?: ReactNode;
}) {
  const [state, send, sending] = useActionState(props.action, {});
  return (
    <form action={send} className="action">
      <input type="hidden" name={props.name} value={props.value} />
      <button type="submit" className={TONE(props)} disabled={sending}>
        {props.icon}
        {props.label}
      </button>
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
