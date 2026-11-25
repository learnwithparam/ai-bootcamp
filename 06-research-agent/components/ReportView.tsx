import type { ReactNode } from "react";
import type { Report } from "../rules/report";
import { TOPICS } from "../rules/topics";
import { ClaimList } from "./ClaimList";
import { ScoreCard } from "./ScoreCard";
import { StatusChip } from "./StatusChip";

// Who the company is, what was typed if it differs, its owner and what the research cost.
function ReportHead({ report, owner }: { report: Report; owner: ReactNode }) {
  const identity = report.identity;
  return (
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
      {identity && identity.name.toLowerCase() !== report.company.toLowerCase() ? (
        <p className="cell-sub">Added as "{report.company}".</p>
      ) : null}
      <div className="report-owner">
        <span>Owner</span> {owner}
      </div>
      <p className="report-cost">Research cost ${report.cost.toFixed(3)}</p>
    </header>
  );
}

// The whole report: who the company is, its score, then every claim with its source and quote.
export function ReportView({ report, owner }: { report: Report; owner: ReactNode }) {
  return (
    <article className="report">
      <ReportHead report={report} owner={owner} />
      {report.status === "failed" ? (
        <p className="form-error" role="alert">
          {report.error}
        </p>
      ) : null}
      {report.status === "running" ? (
        <p className="running">
          {report.topicsDone.length} of {TOPICS.length} topics researched. Each researcher opens the pages it
          cites and keeps a claim only if its quote is there. This page updates by itself.
        </p>
      ) : null}
      {report.score ? <ScoreCard score={report.score} /> : null}
      {report.claims.length > 0 ? <ClaimList claims={report.claims} /> : null}
    </article>
  );
}
