import type { Status } from "../rules/run";

const LABEL: Record<Status, [string, string]> = {
  reading: ["Reading", "pill-agent"],
  filling: ["Filling in", "pill-agent"],
  deciding: ["Deciding", "pill-agent"],
  waiting: ["Needs approval", "pill-wait"],
  submitting: ["Sending", "pill-agent"],
  submitted: ["Sent", "pill-pass"],
  stopped: ["Stopped", "pill-fail"],
  taken_over: ["Taken over", "pill-info"],
  failed: ["Failed", "pill-fail"],
};

export function StatusChip({ status }: { status: Status | null }) {
  if (!status) return <span className="pill">New</span>;
  const [label, tone] = LABEL[status];
  return <span className={`pill ${tone}`}>{label}</span>;
}
