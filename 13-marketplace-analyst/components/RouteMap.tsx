import { Check, LoaderCircle, X } from "lucide-react";
import type { Step, StepName, Timeline } from "../rules/parts";

// The route one question took through the graph, in the order the nodes ran. Under a node: the schema
// tools it called, or the database errors it was given to repair.

const LABEL: Record<StepName, string> = {
  guardrails: "Guardrails",
  sqlAgent: "SQL agent",
  executeSql: "Run the query",
  errorAgent: "Error agent",
  analysis: "Analysis",
  decideGraph: "Chart needed?",
  viz: "Chart",
};

const ICON = { running: LoaderCircle, done: Check, failed: X };

function Node({ step }: { step: Step }) {
  const Icon = ICON[step.status];
  return (
    <li className={`route-node route-${step.status}`}>
      <span className="route-name">
        <Icon aria-hidden="true" /> {LABEL[step.name]}
      </span>
      <span className="route-detail">{step.detail}</span>
      {step.notes?.length ? (
        <ul className="route-notes">
          {step.notes.map((note, at) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a tool may be called twice with one name
            <li key={at}>{note}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function RouteMap({ timeline }: { timeline: Timeline }) {
  const finished = timeline.seconds !== undefined;
  return (
    <div className="route">
      <ol className="route-map" aria-label="Steps taken for this question">
        {timeline.steps.map((step) => (
          <Node key={step.name} step={step} />
        ))}
      </ol>
      <p className="route-total">
        {finished ? `Took ${timeline.seconds}s` : "Working"}, cost US${timeline.costUsd.toFixed(4)}
      </p>
    </div>
  );
}
