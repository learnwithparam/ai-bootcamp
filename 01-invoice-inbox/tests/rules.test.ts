import { describe, expect, test } from "bun:test";
import { findOrder } from "../db/queries";
import type { Invoice } from "../rules/invoice";
import { matchInvoiceToOrder, type PurchaseOrder } from "../rules/match";

// The rules, with no model. The orders come from the seeded Postgres: run `bun run setup` first.

async function seededOrder(orderNumber: number): Promise<PurchaseOrder> {
  const order = await findOrder(orderNumber);
  if (!order) throw new Error(`Order ${orderNumber} is not in Postgres. Run \`bun run setup\`.`);
  return order;
}

// Writes the invoice a supplier would send for an order, billed at list price with no discount.
function invoiceAtListPrice(order: PurchaseOrder, customer = order.customer): Invoice {
  const lines = order.lines.map((line) => {
    const unitPrice = line.unitPriceCents / 100;
    return {
      product: line.product,
      unitPrice,
      quantity: line.quantity,
      lineTotal: (line.unitPriceCents * line.quantity) / 100,
    };
  });
  const total = lines.reduce((sum, line) => sum + Math.round(line.lineTotal * 100), 0) / 100;
  return { invoiceNumber: String(order.orderNumber), customer, invoiceDate: "2016-07-04", lines, total };
}

describe("matching an invoice to its purchase order", () => {
  test("an order with no discount, billed at list price, matches", async () => {
    const order = await seededOrder(10248);
    expect(order.lines.every((line) => line.discountPercent === 0)).toBe(true);
    expect(matchInvoiceToOrder(invoiceAtListPrice(order), order)).toEqual([]);
  });

  test("an order with a 15% discount, billed at list price, flags each discounted line", async () => {
    const order = await seededOrder(10250);
    const problems = matchInvoiceToOrder(invoiceAtListPrice(order), order);
    expect(problems.map((problem) => problem.kind)).toEqual(["price", "price"]);
    expect(problems.map((problem) => problem.message)).toContain(
      "Manjimup Dried Apples: billed $42.40 each, the order agreed $36.04 (15% off $42.40).",
    );
  });
});

describe("what a person must look at", () => {
  test("an invoice with no purchase order goes to a person", () => {
    const invoice: Invoice = {
      invoiceNumber: "99999",
      customer: "Nobody",
      invoiceDate: "2016-01-01",
      lines: [],
      total: 0,
    };
    expect(matchInvoiceToOrder(invoice, undefined).map((problem) => problem.kind)).toEqual(["no-order"]);
  });

  test("a different customer, a missing line and a wrong quantity are each flagged", async () => {
    const order = await seededOrder(10248);
    const invoice = invoiceAtListPrice(order, "Someone Else Ltd");
    const [first] = invoice.lines;
    if (!first || order.lines.length < 2) throw new Error("Order 10248 should have at least two lines.");
    invoice.lines = [
      { ...first, quantity: first.quantity + 1, lineTotal: first.unitPrice * (first.quantity + 1) },
    ];
    invoice.total = invoice.lines[0]?.lineTotal ?? 0;
    const kinds = matchInvoiceToOrder(invoice, order).map((problem) => problem.kind);
    expect(kinds).toContain("customer");
    expect(kinds).toContain("quantity");
    expect(kinds).toContain("missing-line");
    expect(kinds.filter((kind) => kind === "missing-line")).toHaveLength(order.lines.length - 1);
  });
});

describe("checking the invoice adds up", () => {
  test("a line total that is not quantity times price is flagged, and the lines no longer add up to the total", async () => {
    const order = await seededOrder(10248);
    const invoice = invoiceAtListPrice(order);
    const [first] = invoice.lines;
    if (!first) throw new Error("Order 10248 has no lines.");
    first.lineTotal += 1;
    const kinds = matchInvoiceToOrder(invoice, order).map((problem) => problem.kind);
    expect(kinds).toEqual(["line-total", "total"]);
  });

  test("a total that does not match the lines is flagged", async () => {
    const order = await seededOrder(10248);
    const invoice = { ...invoiceAtListPrice(order), total: 1 };
    expect(matchInvoiceToOrder(invoice, order).map((problem) => problem.kind)).toEqual(["total"]);
  });
});
