import { type BillRecord, dueLabel, dueOn } from "../rules/bill";
import { formatCents, toCents } from "../rules/invoice";

// One worklist row, already worded for the screen, so the table component only lays it out.
export type BillRow = {
  id: string;
  number: string;
  billedTo: string;
  amount: string;
  paying: string | null;
  received: string;
  due: { text: string; overdue: boolean } | null;
  status: BillRecord["status"];
  note: string | null;
};

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const OPEN = new Set(["reading", "unreadable", "review", "hold", "approval", "payment"]);

export function rowOf(bill: BillRecord, today: Date): BillRow {
  const billed = bill.extracted ? toCents(bill.extracted.total) : null;
  return {
    id: bill.id,
    number: bill.extracted?.invoiceNumber ?? bill.fileName,
    billedTo: bill.extracted?.customer ?? "Not read yet",
    amount: billed === null ? "" : formatCents(billed),
    paying: bill.payCents !== null && bill.payCents !== billed ? formatCents(bill.payCents) : null,
    received: day.format(bill.receivedAt),
    due: OPEN.has(bill.status) ? dueLabel(dueOn(bill.receivedAt), today) : null,
    status: bill.status,
    note: bill.status === "review" || bill.status === "hold" ? (bill.problems[0]?.message ?? null) : null,
  };
}
