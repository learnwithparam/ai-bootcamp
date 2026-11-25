import type { Report } from "../rules/report";
import { TOPICS } from "../rules/topics";
import { ClaimList } from "./ClaimList";
import { ScoreCard } from "./ScoreCard";
import { StatusChip } from "./StatusChip";

// The whole report: who the company is, its score, then every claim with its source and quote.
export function ReportView({ report }: { report: Report }) {
  const identity = report.identity;
  return (
    <article className="report">
      <header className="report-head">
        <div className="report-title">
          <h1>{identity?.name ?? report.company}</h1>
          <StatusChip report={report} />
        </div>
        {identity ? (
          <p>
            {identity.oneLine}{" "}
            <a href={identity.website} target="_blank" rel="noreferrer noopener">
              {identity.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          </p>
        ) : null}
        <p className="report-cost">Cost of this report: ${report.cost.toFixed(3)}</p>
      </header>
      {report.status === "failed" ? (
        <p className="form-error" role="alert">
          {report.error}
        </p>
      ) : null}
      {report.status === "running" ? (
        <p className="running">
          Searching the web on {TOPICS.length} topics, then opening every cited page to find each quote. This
          page updates by itself.
        </p>
      ) : null}
      {report.score ? <ScoreCard score={report.score} /> : null}
      {report.claims.length > 0 ? <ClaimList claims={report.claims} /> : null}
    </article>
  );
}
