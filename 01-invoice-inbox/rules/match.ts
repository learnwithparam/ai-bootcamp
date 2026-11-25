import { formatCents, type Invoice, type InvoiceLine, sameName, toCents } from "./invoice";

// The three-way check an accounts payable clerk does by hand:
// does the invoice add up, does it match the purchase order, is the price the one we agreed,
// and did the goods arrive?
// No AI here. The model only reads the PDF. These rules decide.

export type OrderLine = {
  product: string;
  unitPriceCents: number;
  quantity: number;
  discountPercent: number;
};
// shippedOn is null while the order has not been delivered. A bill for it is held until it arrives.
export type PurchaseOrder = {
  orderNumber: number;
  customer: string;
  orderedOn: string;
  shippedOn: string | null;
  lines: OrderLine[];
};

export type ProblemKind =
  | "no-order"
  | "customer"
  | "date"
  | "unknown-line"
  | "missing-line"
  | "quantity"
  | "price"
  | "line-total"
  | "total"
  | "not-received"
  | "duplicate";

export type Problem = { kind: ProblemKind; message: string };

// The price we agreed for one unit, after the discount on the purchase order.
export function agreedPriceCents(line: OrderLine): number {
  return Math.round((line.unitPriceCents * (100 - line.discountPercent)) / 100);
}

// Checks the invoice against itself: each line, then the total.
export function checkArithmetic(invoice: Invoice): Problem[] {
  const problems: Problem[] = [];
  let sum = 0;
  for (const line of invoice.lines) {
    const expected = toCents(line.unitPrice) * line.quantity;
    sum += toCents(line.lineTotal);
    if (expected !== toCents(line.lineTotal)) {
      const message = `${line.product}: ${line.quantity} x ${formatCents(toCents(line.unitPrice))} is ${formatCents(expected)}, but the line says ${formatCents(toCents(line.lineTotal))}.`;
      problems.push({ kind: "line-total", message });
    }
  }
  if (sum !== toCents(invoice.total)) {
    const message = `The lines add up to ${formatCents(sum)}, but the total says ${formatCents(toCents(invoice.total))}.`;
    problems.push({ kind: "total", message });
  }
  return problems;
}

function checkLine(billed: InvoiceLine, ordered: OrderLine): Problem[] {
  const problems: Problem[] = [];
  if (billed.quantity !== ordered.quantity) {
    const message = `${billed.product}: billed ${billed.quantity}, the order is for ${ordered.quantity}.`;
    problems.push({ kind: "quantity", message });
  }
  const billedCents = toCents(billed.unitPrice);
  const agreed = agreedPriceCents(ordered);
  if (billedCents !== agreed) {
    const discount = ordered.discountPercent
      ? ` (${ordered.discountPercent}% off ${formatCents(ordered.unitPriceCents)})`
      : "";
    const message = `${billed.product}: billed ${formatCents(billedCents)} each, the order agreed ${formatCents(agreed)}${discount}.`;
    problems.push({ kind: "price", message });
  }
  return problems;
}

// Checks every line on the invoice against the order, and every order line against the invoice.
export function checkLines(invoice: Invoice, order: PurchaseOrder): Problem[] {
  const problems: Problem[] = [];
  for (const billed of invoice.lines) {
    const ordered = order.lines.find((line) => sameName(line.product, billed.product));
    if (!ordered) {
      problems.push({
        kind: "unknown-line",
        message: `${billed.product} is not on order ${order.orderNumber}.`,
      });
      continue;
    }
    problems.push(...checkLine(billed, ordered));
  }
  for (const ordered of order.lines) {
    if (!invoice.lines.some((billed) => sameName(billed.product, ordered.product))) {
      problems.push({ kind: "missing-line", message: `${ordered.product} was ordered but is not billed.` });
    }
  }
  return problems;
}

function checkHeader(invoice: Invoice, order: PurchaseOrder): Problem[] {
  const problems: Problem[] = [];
  if (!sameName(invoice.customer, order.customer)) {
    const message = `Billed to ${invoice.customer}, but order ${order.orderNumber} is for ${order.customer}.`;
    problems.push({ kind: "customer", message });
  }
  if (invoice.invoiceDate < order.orderedOn) {
    const message = `Dated ${invoice.invoiceDate}, before the order was placed on ${order.orderedOn}.`;
    problems.push({ kind: "date", message });
  }
  if (!order.shippedOn) {
    const message = `Order ${order.orderNumber} has not been delivered yet. Nothing was received to pay for.`;
    problems.push({ kind: "not-received", message });
  }
  return problems;
}

// The whole check. An empty list means the invoice can be paid.
export function matchInvoiceToOrder(invoice: Invoice, order: PurchaseOrder | undefined): Problem[] {
  const arithmetic = checkArithmetic(invoice);
  if (!order) {
    const message = `No purchase order ${invoice.invoiceNumber}. Ask the supplier which order this is for.`;
    return [{ kind: "no-order", message }, ...arithmetic];
  }
  return [...arithmetic, ...checkHeader(invoice, order), ...checkLines(invoice, order)];
}
