import { headline, money } from "@bootcamp/coding-harness/rules/labels";
import { SquareTerminal } from "lucide-react";
import Link from "next/link";
import type { RunRow } from "../rules/run";
import { CheckMove, OutcomeChip, StateChip } from "./Chips";
import { when } from "./when";

function EmptyRuns() {
  return (
    <div className="table-wrap empty-state">
      <SquareTerminal aria-hidden="true" />
      <p>
        No runs here. Run the agent in a repo, then send its session with the upload command.{" "}
        <Link href="/terminal">See how</Link>
      </p>
    </div>
  );
}

function RunRowView({ row }: { row: RunRow }) {
  return (
    <tr>
      <th scope="row">
        <Link href={`/runs/${row.id}`} className="row-link">
          {headline(row.task)}
        </Link>
        <span className="cell-sub">
          {row.repo}, by {row.author}
        </span>
      </th>
      <td data-label="Result">
        <OutcomeChip outcome={row.outcome} />
      </td>
      <td data-label="Tests failing">
        <CheckMove before={row.checkBefore} after={row.checkAfter} />
      </td>
      <td data-label="Review">
        <StateChip state={row.state} />
      </td>
      <td data-label="Files" className="num">
        {row.filesChanged}
      </td>
      <td data-label="Cost" className="num">
        {money(row.cost)}
      </td>
      <td data-label="Sent">{when(row.uploadedAt)}</td>
    </tr>
  );
}

// One row per agent run, newest first, with what a reviewer scans before opening one.
export function RunsTable({ rows }: { rows: RunRow[] }) {
  if (!rows.length) return <EmptyRuns />;
  return (
    <div className="table-wrap">
      <table className="table runs-table">
        <thead>
          <tr>
            <th scope="col">Task</th>
            <th scope="col">Result</th>
            <th scope="col">Tests failing</th>
            <th scope="col">Review</th>
            <th scope="col" className="num">
              Files
            </th>
            <th scope="col" className="num">
              Cost
            </th>
            <th scope="col">Sent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <RunRowView key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
