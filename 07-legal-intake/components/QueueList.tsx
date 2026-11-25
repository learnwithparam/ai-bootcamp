import Link from "next/link";
import type { Intake } from "../rules/intake";
import { StatusChip } from "./StatusChip";

// The review queue, newest first. A request with a conflict says so before it is opened.
export function QueueList({ intakes }: { intakes: Intake[] }) {
  if (intakes.length === 0)
    return <p className="empty">No requests yet. They arrive from the public form at /.</p>;
  return (
    <ul className="queue">
      {intakes.map((intake) => (
        <li key={intake.id}>
          <Link href={`/queue/${intake.id}`} className="queue-row">
            <span className="queue-name">{intake.clientName}</span>
            <span className="queue-area">{intake.assessment?.area ?? "not read yet"}</span>
            {intake.conflicts.length > 0 ? <span className="status status-fail">Conflict</span> : null}
            {intake.assessment?.deadline ? (
              <span className="queue-deadline">Due {intake.assessment.deadline.date}</span>
            ) : null}
            <StatusChip status={intake.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
