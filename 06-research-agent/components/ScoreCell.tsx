import type { Report } from "../rules/report";
import { FIT_LABEL, FIT_TONE } from "./StatusChip";

// The lead score, once every topic is in. The number comes from rules/score.ts, never from the model.
export function ScoreCell({ report }: { report: Report }) {
  if (report.score)
    return (
      <span className="score-cell">
        <strong>{report.score.total}</strong>
        <span className={`pill ${FIT_TONE[report.score.fit]}`}>{FIT_LABEL[report.score.fit]}</span>
      </span>
    );
  if (report.status === "running") return <span className="cell-running">Scoring</span>;
  return <span className="cell-none">No score</span>;
}
