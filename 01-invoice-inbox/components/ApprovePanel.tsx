"use client";

import { CheckCheck, CircleDollarSign, Undo2 } from "lucide-react";
import { useActionState } from "react";
import type { FormState } from "../app/actions";
import { approveBills, recordPayment, sendBack } from "../app/approve-actions";

type Props = { id: string; stage: "approval" | "payment"; paying: string };

function Result({ state }: { state: FormState }) {
  return (
    <p aria-live="polite">
      {state.error ? <span className="form-error">{state.error}</span> : null}
      {state.done ? <span className="form-done">{state.done}</span> : null}
    </p>
  );
}

function SendBack({ id }: { id: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendBack, {});
  return (
    <form action={action} className="form-grid send-back">
      <input type="hidden" name="ids" value={id} />
      <div className="form-row form-row-wide">
        <label htmlFor={`back-${id}`}>Or send it back to the clerks</label>
        <textarea id={`back-${id}`} name="note" className="field" rows={2} placeholder="What should change" />
      </div>
      <button type="submit" className="button button-quiet" disabled={pending}>
        <Undo2 aria-hidden="true" /> Send back
      </button>
      <Result state={state} />
    </form>
  );
}

// The approver's step on one bill: sign it off for the payment run, or, once paid, record it.
export function ApprovePanel({ id, stage, paying }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    stage === "approval" ? approveBills : recordPayment,
    {},
  );
  const Icon = stage === "approval" ? CheckCheck : CircleDollarSign;
  return (
    <section className="panel" aria-label={stage === "approval" ? "Approve" : "Record payment"}>
      <div className="panel-head">
        <h2>{stage === "approval" ? "Approve" : "Record payment"}</h2>
      </div>
      <div className="panel-body decide">
        <form action={action} className="approve-row">
          <input type="hidden" name="ids" value={id} />
          <span>
            Pay <strong>{paying}</strong>
          </span>
          <button type="submit" className="button" disabled={pending}>
            <Icon aria-hidden="true" /> {stage === "approval" ? "Approve for payment" : "Record as paid"}
          </button>
        </form>
        <Result state={state} />
        {stage === "approval" ? <SendBack id={id} /> : null}
      </div>
    </section>
  );
}
