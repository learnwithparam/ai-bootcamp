import { Bot, UserRound } from "lucide-react";
import { STEPS, stepStates } from "../rules/board";
import type { Intake } from "../rules/intake";

const WORD = { done: "Done", now: "Now", later: "Later" };

// The graph this request runs through, with the step it is on. A person icon marks the steps that wait for a lawyer.
export function WorkflowSteps({ intake }: { intake: Intake }) {
  const states = stepStates(intake.status, Boolean(intake.decision), Boolean(intake.assessment));
  return (
    <ol className="workflow" aria-label="Workflow">
      {STEPS.map((step, index) => {
        const state = intake.status === "failed" && states[index] === "now" ? "failed" : states[index];
        return (
          <li
            key={step.node}
            className={`workflow-step workflow-${state}`}
            aria-current={state === "now" ? "step" : undefined}
          >
            {step.human ? <UserRound aria-hidden="true" /> : <Bot aria-hidden="true" />}
            <span>{step.label}</span>
            <span className="sr-only">{state === "failed" ? "Failed" : WORD[states[index] ?? "later"]}</span>
          </li>
        );
      })}
    </ol>
  );
}
