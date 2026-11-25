import { Quote } from "lucide-react";
import { deadlineOf } from "../rules/board";
import type { Intake } from "../rules/intake";
import { WorkflowSteps } from "./WorkflowSteps";

function AgentReading({ intake }: { intake: Intake }) {
  const assessment = intake.assessment;
  return assessment ? (
    <section className="panel">
      <h2 className="panel-head">
        The assistant's reading <span className="pill pill-agent">Read by the agent</span>
      </h2>
      <div className="panel-body agent-reading">
        <p>{assessment.summary}</p>
        <ul>
          {assessment.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </div>
    </section>
  ) : (
    <p className="cell-sub">The assistant is still reading this request.</p>
  );
}

function ClientSent({ intake }: { intake: Intake }) {
  const deadline = deadlineOf(intake);
  return (
    <section className="panel">
      <h2 className="panel-head">What the client sent</h2>
      <dl className="facts panel-body">
        <dt>Email</dt>
        <dd>{intake.clientEmail}</dd>
        <dt>The other side</dt>
        <dd>{intake.otherParties.join(", ")}</dd>
        <dt>What they want</dt>
        <dd>{intake.goal || "Not given"}</dd>
        <dt>Date that matters</dt>
        <dd>
          {deadline ? deadline.date : "None given"}
          {deadline?.quote ? (
            <blockquote className="deadline-quote">
              <Quote aria-hidden="true" /> {deadline.quote}
            </blockquote>
          ) : null}
        </dd>
      </dl>
    </section>
  );
}

// What a lawyer reads first: the assistant's reading, marked as the agent's, and the client's own form beside it.
export function MatterSummary({ intake }: { intake: Intake }) {
  return (
    <div className="matter-summary">
      <WorkflowSteps intake={intake} />
      <AgentReading intake={intake} />
      <ClientSent intake={intake} />
    </div>
  );
}
