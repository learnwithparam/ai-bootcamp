import { ShieldCheck } from "lucide-react";
import type { Run } from "../rules/run";
import { may, type Role } from "../rules/team";
import { ActionButton, type ActionState } from "./ActionButton";
import { FormValues } from "./FormValues";

type Action = (previous: ActionState, form: FormData) => Promise<ActionState>;

// The approval checkpoint: the run paused before the click that sends. Everything the lead needs is on one card.
export function Checkpoint({ run, role, approve }: { run: Run; role: Role; approve: Action }) {
  return (
    <section className="panel checkpoint" aria-labelledby="checkpoint">
      <h2 className="panel-head" id="checkpoint">
        <ShieldCheck aria-hidden="true" /> Approve before it sends
      </h2>
      <div className="panel-body">
        {run.reason ? <p className="verdict">{run.reason}</p> : null}
        {run.form ? <FormValues form={run.form} /> : null}
        {may(role, "approve") ? (
          <ActionButton action={approve} name="runId" value={run.id} label="Approve and send" primary />
        ) : (
          <p className="checkpoint-wait">
            Waiting for an intake lead to approve. You can still stop it or take it over.
          </p>
        )}
      </div>
    </section>
  );
}
