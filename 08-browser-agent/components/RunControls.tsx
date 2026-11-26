import { Hand, OctagonX } from "lucide-react";
import { type Run, STOPPABLE } from "../rules/run";
import { ActionButton, type ActionState } from "./ActionButton";

type Action = (previous: ActionState, form: FormData) => Promise<ActionState>;

// The escape hatch, on screen for as long as the agent can still be stopped: before the click that sends.
export function RunControls({ run, stop, takeOver }: { run: Run; stop: Action; takeOver: Action }) {
  if (!STOPPABLE.includes(run.status)) return null;
  return (
    <div className="run-controls page-actions">
      <ActionButton
        action={takeOver}
        name="runId"
        value={run.id}
        label="Take over"
        icon={<Hand aria-hidden="true" />}
      />
      <ActionButton
        action={stop}
        name="runId"
        value={run.id}
        label="Stop"
        icon={<OctagonX aria-hidden="true" />}
        danger
      />
    </div>
  );
}
