import { formatCents, type Invoice, sameName, toCents } from "./invoice";
import type { FieldCheck } from "./locate";
import { agreedPriceCents, type Problem, type PurchaseOrder } from "./match";

// Where a bill stands, from the moment it arrives to the moment it is paid. No AI here.
// reading: the assistant is reading it. unreadable: it could not, and a person reads the PDF.
// review: something does not match, and a clerk decides. hold: the clerk is waiting, for example for a delivery.
// approval: it matches, or a clerk fixed it, and an approver signs it off. payment: approved, waiting to be paid.
export const BILL_STATUSES = [
  "reading",
  "unreadable",
  "review",
  "hold",
  "approval",
  "payment",
  "paid",
  "rejected",
] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export type Role = "clerk" | "approver";

export const TABS = {
  review: { label: "Needs review", statuses: ["reading", "unreadable", "review", "hold"] },
  approval: { label: "For approval", statuses: ["approval"] },
  payment: { label: "For payment", statuses: ["payment"] },
  paid: { label: "Paid", statuses: ["paid"] },
  all: { label: "All bills", statuses: BILL_STATUSES },
} as const satisfies Record<string, { label: string; statuses: readonly BillStatus[] }>;
export type Tab = keyof typeof TABS;

export const isTab = (value: unknown): value is Tab => typeof value === "string" && value in TABS;

// The suggestion the assistant puts on a bill that does not match. The clerk accepts it, or writes their own.
export type Fix =
  | { kind: "pay"; payCents: number; reason: string }
  | { kind: "hold"; reason: string }
  | { kind: "reject"; reason: string };

// What the inbox knows about one bill, without the PDF itself.
export type BillRecord = {
  id: string;
  fileName: string;
  uploadedBy: string;
  receivedAt: Date;
  status: BillStatus;
  extracted: Invoice | null;
  fields: FieldCheck[];
  problems: Problem[];
  fix: Fix | null;
  payCents: number | null;
  duplicateOf: string | null;
};

// Supplier terms: a bill is due 30 days after it arrives.
export const TERMS_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export function dueOn(receivedAt: Date): Date {
  return new Date(receivedAt.getTime() + TERMS_DAYS * DAY);
}

// "Due in 4 days", "Due today", "Overdue by 2 days". Whole days in UTC, so the label is the same for everyone.
export function dueLabel(due: Date, today: Date): { text: string; overdue: boolean } {
  const days = Math.round(
    (Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) -
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) /
      DAY,
  );
  const plural = (count: number) => `${count} day${count === 1 ? "" : "s"}`;
  if (days === 0) return { text: "Due today", overdue: false };
  if (days > 0) return { text: `Due in ${plural(days)}`, overdue: false };
  return { text: `Overdue by ${plural(-days)}`, overdue: true };
}

// A second bill with the same number as one already received is the same bill sent twice.
export function duplicateProblem(invoiceNumber: string, earlier: { id: string; number: string }[]) {
  const first = earlier.find((bill) => sameName(bill.number, invoiceNumber));
  if (!first) return null;
  const problem: Problem = {
    kind: "duplicate",
    message: `Bill ${invoiceNumber} was already received. Paying this one would pay it twice.`,
  };
  return { problem, duplicateOf: first.id };
}

// What the order supports paying: each billed product at the agreed price, for no more than was ordered.
export function supportedCents(invoice: Invoice, order: PurchaseOrder): number {
  return invoice.lines.reduce((sum, billed) => {
    const ordered = order.lines.find((line) => sameName(line.product, billed.product));
    if (!ordered) return sum;
    return sum + agreedPriceCents(ordered) * Math.min(billed.quantity, ordered.quantity);
  }, 0);
}

const has = (problems: Problem[], ...kinds: Problem["kind"][]) =>
  problems.some((problem) => kinds.includes(problem.kind));

// The fix the clerk sees first. The worst problem decides: a duplicate or a wrong customer is rejected,
// a bill with no order or no delivery is held, and a wrong price or quantity is paid at what the order supports.
export function suggestFix(
  invoice: Invoice,
  order: PurchaseOrder | undefined,
  problems: Problem[],
): Fix | null {
  if (problems.length === 0) return null;
  if (has(problems, "duplicate"))
    return { kind: "reject", reason: "Reject it as a duplicate, so it is paid once." };
  if (has(problems, "customer"))
    return { kind: "reject", reason: "Reject it. It is billed to the wrong customer." };
  if (!order || has(problems, "no-order"))
    return { kind: "hold", reason: "Hold it and ask the supplier which order it is for." };
  if (has(problems, "not-received"))
    return { kind: "hold", reason: "Hold it until the delivery arrives, then pay it." };
  const pay = supportedCents(invoice, order);
  const over = toCents(invoice.total) - pay;
  if (over <= 0)
    return { kind: "pay", payCents: pay, reason: `Pay ${formatCents(pay)}, the amount the order supports.` };
  return {
    kind: "pay",
    payCents: pay,
    reason: `Pay ${formatCents(pay)}, the order's agreed prices, and ask for a credit note for the ${formatCents(over)} over.`,
  };
}

// Who may do what. A clerk reviews and fixes; only an approver signs a bill off or records that it was paid.
export function may(role: Role, action: "review" | "approve" | "pay"): boolean {
  return action === "review" || role === "approver";
}

// The amount a clerk types, such as "1484" or "1,484.50", in cents. Null when it is not an amount
// this bill can be paid: nothing, negative, more than two decimals, or more than the bill asks for.
export function parseAmount(text: string, billedCents: number): number | null {
  const match = /^\$?\s*(\d[\d,]*(?:\.\d{1,2})?)$/.exec(text.trim());
  if (!match?.[1]) return null;
  const cents = toCents(Number(match[1].replaceAll(",", "")));
  return cents > 0 && cents <= billedCents ? cents : null;
}
