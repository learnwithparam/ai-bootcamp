import type { Status } from "../rules/run";

const LABEL: Record<Status, [string, string]> = {
  reading: ["Reading", "status-wait"],
  filling: ["Filling in", "status-wait"],
  deciding: ["Deciding", "status-wait"],
  waiting: ["Waiting for you", "status-wait"],
  submitting: ["Sending", "status-wait"],
  submitted: ["Sent", "status-pass"],
  stopped: ["Stopped", "status-fail"],
  failed: ["Failed", "status-fail"],
};

export function StatusChip({ status }: { status: Status | null }) {
  if (!status) return <span className="status">Not run yet</span>;
  const [label, tone] = LABEL[status];
  return <span className={`status ${tone}`}>{label}</span>;
}
