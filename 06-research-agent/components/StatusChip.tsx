import type { Report } from "../rules/report";

export const FIT_LABEL = { strong: "Strong fit", possible: "Possible fit", weak: "Weak fit" };
export const FIT_TONE = { strong: "pill-pass", possible: "pill-wait", weak: "pill-fail" };

// One chip for where an account stands: still being researched, failed, or the fit it scored.
export function StatusChip({ report }: { report: Report }) {
  if (report.status === "running") return <span className="pill pill-agent">{report.step}</span>;
  if (report.status === "failed") return <span className="pill pill-fail">Not found</span>;
  const fit = report.score?.fit ?? "weak";
  return <span className={`pill ${FIT_TONE[fit]}`}>{FIT_LABEL[fit]}</span>;
}
