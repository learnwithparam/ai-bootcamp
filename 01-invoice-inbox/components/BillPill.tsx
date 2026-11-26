import { LoaderCircle } from "lucide-react";
import type { BillStatus } from "../rules/bill";

const LOOK: Record<BillStatus, { label: string; tone: string }> = {
  reading: { label: "Reading", tone: "pill-agent" },
  unreadable: { label: "Could not read", tone: "pill-fail" },
  review: { label: "Needs review", tone: "pill-wait" },
  hold: { label: "On hold", tone: "pill-info" },
  approval: { label: "For approval", tone: "pill-info" },
  payment: { label: "For payment", tone: "pill-pass" },
  paid: { label: "Paid", tone: "pill-pass" },
  rejected: { label: "Rejected", tone: "pill" },
};

export function BillPill({ status }: { status: BillStatus }) {
  const look = LOOK[status];
  return (
    <span className={`pill ${look.tone}`}>
      {status === "reading" ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
      {look.label}
    </span>
  );
}
