import type { InvoiceStatus } from "../rules/match";

const LOOK: Record<InvoiceStatus, { className: string; text: string }> = {
  exception: { className: "status status-wait", text: "needs a person" },
  matched: { className: "status status-pass", text: "matched" },
  approved: { className: "status status-pass", text: "approved" },
  rejected: { className: "status status-fail", text: "rejected" },
};

export function StatusChip({ status }: { status: InvoiceStatus }) {
  const look = LOOK[status];
  return <span className={look.className}>{look.text}</span>;
}
