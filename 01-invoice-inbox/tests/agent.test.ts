import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkInvoice, readInvoice } from "../agent/agent";
import { findOrder } from "../db/queries";
import { SAMPLE_FOLDER, SAMPLE_ORDERS } from "../db/seed";
import { toCents } from "../rules/invoice";

// The real model reads the 20 sample invoices. Costs about a quarter of a US cent per run on the default model.
// The answer key is Northwind itself: each invoice bills the order's lines at list price, without the discount.
// So the reading must equal the order line for line, and an invoice is an exception exactly when its order had a discount.

type Result = {
  orderNumber: number;
  linesMatch: boolean;
  flagged: boolean;
  discounted: boolean;
  cost: number;
};

async function readOne(orderNumber: number): Promise<Result> {
  const fileName = `invoice_${orderNumber}.pdf`;
  const { invoice, usage } = await readInvoice(readFileSync(join(SAMPLE_FOLDER, fileName)), fileName);
  const order = await findOrder(orderNumber);
  if (!order) throw new Error(`Order ${orderNumber} is not in Postgres. Run \`bun run setup\`.`);
  const read = invoice.lines
    .map((line) => `${line.product}|${toCents(line.unitPrice)}|${line.quantity}`)
    .sort();
  const truth = order.lines.map((line) => `${line.product}|${line.unitPriceCents}|${line.quantity}`).sort();
  const problems = await checkInvoice(invoice);
  const raw = usage.raw as { cost?: number } | undefined;
  return {
    orderNumber,
    linesMatch: JSON.stringify(read) === JSON.stringify(truth),
    flagged: problems.length > 0,
    discounted: order.lines.some((line) => line.discountPercent > 0),
    cost: raw?.cost ?? 0,
  };
}

test("the model reads every sample invoice, and only discounted orders are flagged", async () => {
  const results = await Promise.all(SAMPLE_ORDERS.map(readOne));
  const misread = results.filter((result) => !result.linesMatch).map((result) => result.orderNumber);
  const wrongCall = results
    .filter((result) => result.flagged !== result.discounted)
    .map((result) => result.orderNumber);
  const cost = results.reduce((sum, result) => sum + result.cost, 0);
  console.log(
    `Read ${results.length} invoices for $${cost.toFixed(4)}. Misread: [${misread}]. Wrong call: [${wrongCall}].`,
  );
  expect(misread).toEqual([]);
  expect(wrongCall).toEqual([]);
}, 180_000);
