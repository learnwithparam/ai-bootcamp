"use client";

import { Check, RotateCw, Sparkles } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { type FormState, readAgain, reviewBill } from "../app/actions";
import type { Fix } from "../rules/bill";

type Props = { id: string; status: "review" | "hold" | "unreadable"; fix: Fix | null; billed: string };

const ACCEPT: Record<Fix["kind"], string> = { pay: "accept", hold: "hold", reject: "reject" };
const CHOICES = [
  { value: "pay", label: "Pay a different amount" },
  { value: "hold", label: "Hold it" },
  { value: "reject", label: "Reject it" },
] as const;

function Suggestion({ id, fix, pending }: { id: string; fix: Fix; pending: boolean }) {
  return (
    <div className="suggestion">
      <p>
        <Sparkles aria-hidden="true" /> <strong>Suggested fix.</strong> {fix.reason}
      </p>
      <button
        type="submit"
        name="choice"
        value={ACCEPT[fix.kind]}
        className="button"
        disabled={pending}
        form={`accept-${id}`}
      >
        <Check aria-hidden="true" /> Accept
      </button>
    </div>
  );
}

type ChoiceProps = { suggested: boolean; choice: string; onChoose: (value: string) => void };

function Choices({ suggested, choice, onChoose }: ChoiceProps) {
  return (
    <fieldset className="choice-group form-row-wide">
      <legend>{suggested ? "Or decide yourself" : "Decide yourself"}</legend>
      {CHOICES.map((each) => (
        <label key={each.value} className="choice">
          <input
            type="radio"
            name="choice"
            value={each.value}
            checked={choice === each.value}
            onChange={() => onChoose(each.value)}
          />
          {each.label}
        </label>
      ))}
    </fieldset>
  );
}

type Own = { id: string; billed: string; suggested: boolean; fix: Fix | null };

function OwnDecision({ id, billed, suggested, fix }: Own) {
  const [state, action, pending] = useActionState<FormState, FormData>(reviewBill, {});
  const [choice, setChoice] = useState<string>(fix?.kind === "pay" ? "pay" : "hold");
  // Submitted by hand, not through the form's action, so a refused save keeps what the clerk typed.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  return (
    <form onSubmit={submit} className="form-grid">
      <input type="hidden" name="id" value={id} />
      <Choices suggested={suggested} choice={choice} onChoose={setChoice} />
      {choice === "pay" ? (
        <div className="form-row">
          <label htmlFor={`amount-${id}`}>Amount to pay</label>
          <input id={`amount-${id}`} name="amount" className="field" inputMode="decimal" placeholder="0.00" />
          <span className="form-hint">Up to {billed}, the amount billed.</span>
        </div>
      ) : null}
      <div className="form-row form-row-wide">
        <label htmlFor={`note-${id}`}>Note</label>
        <textarea
          id={`note-${id}`}
          name="note"
          className="field"
          rows={2}
          placeholder="Why, for the approver and the audit trail"
        />
      </div>
      <button type="submit" className="button" disabled={pending}>
        Save decision
      </button>
      <p className="form-row-wide" aria-live="polite">
        {state.error ? <span className="form-error">{state.error}</span> : null}
        {state.done ? <span className="form-done">{state.done}</span> : null}
      </p>
    </form>
  );
}

// The clerk's decision on a bill that needs review: take the assistant's suggestion in one click,
// or choose another way and say why. A held or unreadable bill can also be read and checked again.
export function ReviewPanel({ id, status, fix, billed }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(reviewBill, {});
  return (
    <section className="panel" aria-label="Decide">
      <div className="panel-head">
        <h2>Decide</h2>
      </div>
      <div className="panel-body decide">
        <form id={`accept-${id}`} action={action}>
          <input type="hidden" name="id" value={id} />
        </form>
        {fix && status === "review" ? <Suggestion id={id} fix={fix} pending={pending} /> : null}
        {state.error ? <p className="form-error">{state.error}</p> : null}
        {status !== "review" ? (
          <form action={readAgain}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="button button-quiet">
              <RotateCw aria-hidden="true" /> Read and check it again
            </button>
          </form>
        ) : null}
        <OwnDecision id={id} billed={billed} suggested={Boolean(fix && status === "review")} fix={fix} />
      </div>
    </section>
  );
}
