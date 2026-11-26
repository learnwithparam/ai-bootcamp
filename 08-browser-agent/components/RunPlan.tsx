import { ListChecks } from "lucide-react";
import { ACTIVE, PLAN, type Run } from "../rules/run";
import { StatusChip } from "./StatusChip";
import { when } from "./when";

function stageState(run: Run, stage: number): "done" | "now" | "todo" {
  const last = run.steps.at(-1)?.stage ?? -1;
  if (ACTIVE.includes(run.status) && stage === last) return "now";
  return run.steps.some((step) => step.stage === stage) ? "done" : "todo";
}

// The activity panel: the plan, ticked off as the agent logs each step, with what it did in words.
export function RunPlan({ run }: { run: Run }) {
  return (
    <section className="panel" aria-labelledby="activity">
      <h2 className="panel-head" id="activity">
        <ListChecks aria-hidden="true" /> Activity
        <span className="plan-head">
          <StatusChip status={run.status} />
          <span className="plan-cost">
            ${run.cost.toFixed(4)}
            {ACTIVE.includes(run.status) ? " so far" : ""}
          </span>
        </span>
      </h2>
      <ol className="plan-steps panel-body">
        {PLAN.map((name, stage) => (
          <li key={name} className={`plan-step plan-${stageState(run, stage)}`}>
            <span className="plan-name">{name}</span>
            {run.steps
              .filter((step) => step.stage === stage)
              .map((step) => (
                <span key={step.at} className="plan-log">
                  <time dateTime={step.at}>{when(step.at).split(", ")[1]}</time> {step.text}
                </span>
              ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
