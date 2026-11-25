import { connect } from "@bootcamp/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Invoice } from "../rules/invoice";
import type { InvoiceRecord, Problem, PurchaseOrder } from "../rules/match";
import * as schema from "./schema";

const db = connect(schema);
const { invoices, orderLines, purchaseOrders } = schema;

// The purchase order with its lines, or undefined when there is no such order.
export async function findOrder(orderNumber: number): Promise<PurchaseOrder | undefined> {
  if (!Number.isSafeInteger(orderNumber)) return undefined;
  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.orderNumber, orderNumber));
  if (!order) return undefined;
  const lines = await db
    .select()
    .from(orderLines)
    .where(eq(orderLines.orderNumber, orderNumber))
    .orderBy(asc(orderLines.product));
  return { ...order, lines };
}

export async function saveOrders(orders: PurchaseOrder[]): Promise<void> {
  await db.transaction(async (tx) => {
    const numbers = orders.map((order) => order.orderNumber);
    await tx.delete(orderLines).where(inArray(orderLines.orderNumber, numbers));
    await tx
      .insert(purchaseOrders)
      .values(orders.map(({ lines, ...order }) => order))
      .onConflictDoNothing();
    const lines = orders.flatMap((order) =>
      order.lines.map((line) => ({ ...line, orderNumber: order.orderNumber })),
    );
    for (let start = 0; start < lines.length; start += 1000) {
      await tx.insert(orderLines).values(lines.slice(start, start + 1000));
    }
  });
}

type NewInvoice = {
  fileName: string;
  pdf: Buffer;
  uploadedBy: string;
  extracted: Invoice;
  problems: Problem[];
};

export async function saveInvoice(invoice: NewInvoice): Promise<string> {
  const status = invoice.problems.length ? "exception" : "matched";
  const [row] = await db
    .insert(invoices)
    .values({ ...invoice, status })
    .returning({ id: invoices.id });
  if (!row) throw new Error("Saving the invoice returned no row.");
  return row.id;
}

const summaryColumns = {
  id: invoices.id,
  fileName: invoices.fileName,
  uploadedBy: invoices.uploadedBy,
  uploadedAt: invoices.uploadedAt,
  extracted: invoices.extracted,
  problems: invoices.problems,
  status: invoices.status,
  decidedBy: invoices.decidedBy,
  decidedAt: invoices.decidedAt,
  note: invoices.note,
};

export async function listInvoices(): Promise<InvoiceRecord[]> {
  return db.select(summaryColumns).from(invoices).orderBy(desc(invoices.uploadedAt));
}

export async function findInvoice(id: string): Promise<InvoiceRecord | undefined> {
  const [row] = await db.select(summaryColumns).from(invoices).where(eq(invoices.id, id));
  return row;
}

export async function invoicePdf(id: string): Promise<Buffer | undefined> {
  const [row] = await db.select({ pdf: invoices.pdf }).from(invoices).where(eq(invoices.id, id));
  return row?.pdf;
}

// A person clears an exception: approve to pay it anyway, or reject it back to the supplier.
// Only an invoice still waiting changes, so a second click never overwrites someone else's decision.
// Returns false when nothing changed.
export async function recordDecision(id: string, status: "approved" | "rejected", by: string, note: string) {
  const changed = await db
    .update(invoices)
    .set({ status, decidedBy: by, decidedAt: new Date(), note })
    .where(and(eq(invoices.id, id), eq(invoices.status, "exception")))
    .returning({ id: invoices.id });
  return changed.length > 0;
}
