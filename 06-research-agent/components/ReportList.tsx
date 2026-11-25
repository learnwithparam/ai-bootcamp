import Link from "next/link";
import type { Report } from "../rules/report";
import { StatusChip } from "./StatusChip";

// Your reports, newest first. Each row opens its report.
export function ReportList({ reports }: { reports: Report[] }) {
  if (reports.length === 0)
    return <p className="empty">No reports yet. Type a company above to run your first.</p>;
  return (
    <ul className="report-list">
      {reports.map((report) => (
        <li key={report.id}>
          <Link href={`/reports/${report.id}`} className="report-row">
            <span className="report-name">{report.identity?.name ?? report.company}</span>
            <span className="report-score">{report.score ? `${report.score.total} of 100` : ""}</span>
            <StatusChip report={report} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
