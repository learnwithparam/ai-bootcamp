import type { Conflict, Intake } from "../rules/intake";
import { StatusChip } from "./StatusChip";

function Conflicts({ conflicts }: { conflicts: Conflict[] }) {
  if (conflicts.length === 0) return <p className="clear">No conflicts with the firm's records.</p>;
  return (
    <ul className="conflicts" aria-label="Conflicts">
      {conflicts.map((conflict) => (
        <li key={`${conflict.name}-${conflict.matter}`} className={`conflict conflict-${conflict.match}`}>
          <strong>{conflict.match === "exact" ? "Conflict" : "Possible conflict"}:</strong> {conflict.name}{" "}
          matches {conflict.record}, our {conflict.role === "client" ? "client" : "opponent"} on{" "}
          {conflict.matter}.
        </li>
      ))}
    </ul>
  );
}

// Everything a lawyer needs to decide: the client's own words, what the model read, and what code checked.
export function IntakeView({ intake }: { intake: Intake }) {
  const assessment = intake.assessment;
  return (
    <article className="matter">
      <header className="matter-head">
        <h1>{intake.clientName}</h1>
        <StatusChip status={intake.status} />
        <span className="matter-cost">Model cost ${intake.cost.toFixed(4)}</span>
      </header>
      {intake.error ? <p className="form-error">{intake.error}</p> : null}
      {assessment ? (
        <section aria-label="Assessment" className="assessment">
          <p className="area">{assessment.area}</p>
          <p>{assessment.summary}</p>
          <ul>
            {assessment.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          {assessment.deadline ? (
            <p className="deadline">
              Deadline {assessment.deadline.date}: <q>{assessment.deadline.quote}</q>
            </p>
          ) : null}
        </section>
      ) : null}
      {assessment ? <Conflicts conflicts={intake.conflicts} /> : null}
      <details className="story">
        <summary>The client's own words</summary>
        <p>{intake.story}</p>
        <p className="story-meta">
          {intake.clientEmail}. Other parties given: {intake.otherParties.join(", ") || "none"}.
        </p>
      </details>
    </article>
  );
}
