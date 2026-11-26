import { ExternalLink } from "lucide-react";
import type { Run } from "../rules/run";
import { FormValues } from "./FormValues";

// What happened once the run ended: the request it made, or why it did not send, and who decided.
export function Outcome({ run, portal }: { run: Run; portal: string }) {
  return (
    <section className={`panel outcome outcome-${run.status}`} aria-labelledby="outcome">
      <h2 className="panel-head" id="outcome">
        {TITLE[run.status] ?? "Outcome"}
      </h2>
      <div className="panel-body">
        {run.reason ? <p className="reason">{run.reason}</p> : null}
        {run.decidedBy && !run.reason?.includes(run.decidedBy) ? (
          <p className="reason">Decided by {run.decidedBy}.</p>
        ) : null}
        {run.requestUrl ? (
          <a href={run.requestUrl} target="_blank" rel="noreferrer" className="button">
            <ExternalLink aria-hidden="true" /> Open the request on the portal
          </a>
        ) : null}
        {run.status === "taken_over" ? (
          <>
            <a href={`${portal}/intake`} target="_blank" rel="noreferrer" className="button button-primary">
              <ExternalLink aria-hidden="true" /> Open the intake portal
            </a>
            {run.form ? <FormValues form={run.form} copy /> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

const TITLE: Partial<Record<Run["status"], string>> = {
  submitted: "Sent to the portal",
  stopped: "Stopped, nothing was sent",
  taken_over: "Send this one by hand",
  failed: "The run failed",
};
