import { ACTIVE, PLAN, type Run } from "../rules/run";
import { StatusChip } from "./StatusChip";

const CHOICE = { submit: "send it", stop: "do not send it", ask_human: "ask a person" };

function stageState(run: Run, stage: number): "done" | "now" | "todo" {
  const last = run.steps.at(-1)?.stage ?? -1;
  if (ACTIVE.includes(run.status) && stage === last) return "now";
  return run.steps.some((step) => step.stage === stage) ? "done" : "todo";
}

// The plan, ticked off as the log fills in, then the decision and why code acted on it.
export function RunPlan({ run }: { run: Run }) {
  return (
    <div className="plan">
      <div className="plan-head">
        <StatusChip status={run.status} />
        <span className="plan-cost">
          ${run.cost.toFixed(4)}
          {ACTIVE.includes(run.status) ? " so far" : ""}
        </span>
      </div>
      <ol className="plan-steps">
        {PLAN.map((name, stage) => (
          <li key={name} className={`plan-step plan-${stageState(run, stage)}`}>
            <span className="plan-name">{name}</span>
            {run.steps
              .filter((step) => step.stage === stage)
              .map((step) => (
                <span key={step.at} className="plan-log">
                  {step.text}
                </span>
              ))}
          </li>
        ))}
      </ol>
      {run.verdict ? (
        <p className={`verdict verdict-${run.verdict.choice}`}>
          The decision model said {CHOICE[run.verdict.choice]}, {Math.round(run.verdict.confidence * 100)}%
          sure.
        </p>
      ) : null}
      {run.reason ? <p className="reason">{run.reason}</p> : null}
      {run.decidedBy && !ACTIVE.includes(run.status) ? (
        <p className="reason">Decided by {run.decidedBy}.</p>
      ) : null}
    </div>
  );
}
