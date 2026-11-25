import type { Report } from "../rules/report";

const FIT_LABEL = { strong: "Strong fit", possible: "Possible fit", weak: "Weak fit" };

// One chip for where a report stands: still running, failed, or the fit it scored.
export function StatusChip({ report }: { report: Report }) {
  if (report.status === "running") return <span className="status status-wait">{report.step}</span>;
  if (report.status === "failed") return <span className="status status-fail">Failed</span>;
  const fit = report.score?.fit ?? "weak";
  const tone = fit === "strong" ? "status-pass" : fit === "possible" ? "status-wait" : "status-fail";
  return <span className={`status ${tone}`}>{FIT_LABEL[fit]}</span>;
}
