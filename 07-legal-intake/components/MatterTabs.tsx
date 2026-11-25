import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { HistoryEntry } from "../agent/history";
import { type Conflict, type Intake, numbered } from "../rules/intake";

// The matter page's other tabs: the client's own words, the conflict check, and the saved run's history.

export function ClientWords({ intake }: { intake: Intake }) {
  const turns =
    intake.transcript.length > 0 ? intake.transcript : [{ from: "client" as const, text: intake.story }];
  return (
    <ol className="turns turns-record" aria-label="The intake conversation">
      {numbered(turns).map((turn) => (
        <li key={turn.place} className={`turn turn-${turn.from}`}>
          <span className="turn-who">{turn.from === "agent" ? "Assistant" : intake.clientName}</span>
          <p>{turn.text}</p>
        </li>
      ))}
    </ol>
  );
}

function ConflictRow({ conflict }: { conflict: Conflict }) {
  return (
    <tr>
      <td>{conflict.name}</td>
      <td>{conflict.record}</td>
      <td>{conflict.role === "client" ? "Our client" : "Against us"}</td>
      <td>{conflict.matter}</td>
      <td>
        <span className={`pill ${conflict.match === "exact" ? "pill-fail" : "pill-wait"}`}>
          {conflict.match === "exact" ? "Same name" : "Possible match"}
        </span>
      </td>
    </tr>
  );
}

// Code compared every name with the firm's records. The model never decides whether a conflict counts.
export function ConflictCheck({ intake }: { intake: Intake }) {
  if (!intake.assessment)
    return <p className="cell-sub">The check runs after the assistant reads the request.</p>;
  if (intake.conflicts.length === 0)
    return (
      <p className="conflict-clear">
        <CheckCircle2 aria-hidden="true" /> No name in this request matches the firm's records.
      </p>
    );
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name in the request</th>
            <th>Our record</th>
            <th>Role</th>
            <th>Matter</th>
            <th>Match</th>
          </tr>
        </thead>
        <tbody>
          {intake.conflicts.map((conflict) => (
            <ConflictRow key={`${conflict.name}-${conflict.matter}`} conflict={conflict} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const time = (at: Date) => at.toISOString().slice(0, 16).replace("T", " ");

export function History({ entries, intake }: { entries: HistoryEntry[]; intake: Intake }) {
  return (
    <ol className="timeline" aria-label="History">
      <li>
        <time>{time(intake.createdAt)}</time>
        Request sent from the website
      </li>
      {entries.map((entry) => (
        <li key={`${entry.node}-${entry.at.getTime()}`}>
          <time>{time(entry.at)}</time>
          {entry.label} finished
          {entry.paused ? (
            <span className="cell-sub">
              Paused here for a lawyer. The run is saved and survives a restart.
            </span>
          ) : null}
        </li>
      ))}
      {intake.status === "failed" ? (
        <li>
          <AlertTriangle aria-hidden="true" /> The next step failed. It runs again from here when someone
          presses Try again.
        </li>
      ) : null}
    </ol>
  );
}
