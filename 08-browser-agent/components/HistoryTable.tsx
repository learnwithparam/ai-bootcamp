import { History } from "lucide-react";
import Link from "next/link";
import type { HistoryRow } from "../rules/run";
import { StatusChip } from "./StatusChip";
import { when } from "./when";

const took = (row: HistoryRow) => {
  if (!row.finishedAt) return row.status === "waiting" ? "Waiting" : "Running";
  return `${Math.max(1, Math.round((row.finishedAt.getTime() - row.createdAt.getTime()) / 60_000))} min`;
};

// A person's name, the decision model, or the agent's own checks when it stopped before asking anyone.
const decider = (row: HistoryRow) => {
  if (row.decidedBy) return row.decidedBy.charAt(0).toUpperCase() + row.decidedBy.slice(1);
  return row.finishedAt ? "The agent's checks" : "Not yet";
};

function EmptyHistory() {
  return (
    <div className="table-wrap empty-state">
      <History aria-hidden="true" />
      <p>No runs yet. Open an email in the inbox and run the agent on it.</p>
    </div>
  );
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (!rows.length) return <EmptyHistory />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Email</th>
            <th scope="col">Outcome</th>
            <th scope="col">Decided by</th>
            <th scope="col">Started</th>
            <th scope="col">Took</th>
            <th scope="col" className="num">
              Cost
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                <Link href={`/runs/${row.id}`} className="row-link">
                  {row.subject}
                </Link>
                <span className="cell-sub">{row.fromName}</span>
              </th>
              <td>
                <StatusChip status={row.status} />
              </td>
              <td>{decider(row)}</td>
              <td>{when(row.createdAt)}</td>
              <td>{took(row)}</td>
              <td className="num">${row.cost.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
