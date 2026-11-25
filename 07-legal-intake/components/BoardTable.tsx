import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { daysLeft, deadlineOf, urgency } from "../rules/board";
import type { Intake } from "../rules/intake";
import { StatusChip } from "./StatusChip";

function DeadlineCell({ intake, today }: { intake: Intake; today: Date }) {
  const deadline = deadlineOf(intake);
  if (!deadline) return <span className="cell-sub">None given</span>;
  const days = daysLeft(deadline.date, today);
  const tone = { overdue: "pill-fail", "this week": "pill-wait", later: "" }[urgency(deadline.date, today)];
  const left = days < 0 ? `${-days} days ago` : days === 0 ? "today" : `in ${days} days`;
  return (
    <>
      {deadline.date}
      <span className={`pill ${tone}`}>{left}</span>
    </>
  );
}

function ConflictCell({ intake }: { intake: Intake }) {
  if (!intake.assessment) return <span className="cell-sub">Not checked yet</span>;
  if (intake.conflicts.some((conflict) => conflict.match === "exact"))
    return (
      <span className="pill pill-fail">
        <AlertTriangle aria-hidden="true" /> Conflict
      </span>
    );
  if (intake.conflicts.length > 0) return <span className="pill pill-wait">Possible match</span>;
  return <span className="pill pill-pass">Clear</span>;
}

function BoardRow({ intake, today }: { intake: Intake; today: Date }) {
  return (
    <tr>
      <td>
        <Link href={`/queue/${intake.id}`} className="row-link">
          {intake.clientName}
        </Link>
        <span className="cell-sub">{intake.assessment?.summary.split(". ")[0] ?? intake.goal}</span>
      </td>
      <td>{intake.assessment ? <span className="pill pill-info">{intake.assessment.area}</span> : null}</td>
      <td className="board-deadline">
        <DeadlineCell intake={intake} today={today} />
      </td>
      <td>
        <ConflictCell intake={intake} />
      </td>
      <td className="num">{intake.createdAt.toISOString().slice(0, 10)}</td>
      <td>
        <StatusChip status={intake.status} />
      </td>
    </tr>
  );
}

const COLUMNS = ["Client", "Area", "Date that matters", "Conflicts", "Received", "Status"];

// The intake board: one row per request, closest deadline first.
export function BoardTable({ intakes, today }: { intakes: Intake[]; today: Date }) {
  return (
    <div className="table-wrap">
      <table className="table board">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {intakes.map((intake) => (
            <BoardRow key={intake.id} intake={intake} today={today} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
