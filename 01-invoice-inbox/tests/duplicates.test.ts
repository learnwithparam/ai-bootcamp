import { afterAll, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inArray } from "drizzle-orm";
import { saveChecked } from "../agent/agent";
import { addBill, findBill } from "../db/bills";
import { db } from "../db/queries";
import { billEvents, bills } from "../db/schema";
import { SAMPLE_FOLDER } from "../db/seed";
import type { Invoice } from "../rules/invoice";

// Two copies of a new bill uploaded together are read at the same moment. Without a lock, each checks
// for the other before either is saved, both pass, and the bill is paid twice. No model: the reading is
// written here, and the PDF is a real sample so the page check runs as it does in the app.

const pdf = readFileSync(join(SAMPLE_FOLDER, "invoice_10251.pdf"));
const number = String(900_000_000 + Math.floor(Math.random() * 1_000_000));
const invoice: Invoice = {
  invoiceNumber: number,
  customer: "Victuailles en stock",
  invoiceDate: "2016-07-08",
  lines: [{ product: "Ravioli Angelo", unitPrice: 15.6, quantity: 15, lineTotal: 234 }],
  total: 234,
};
const ids: string[] = [];

afterAll(async () => {
  if (ids.length === 0) return;
  await db.delete(billEvents).where(inArray(billEvents.billId, ids));
  await db.delete(bills).where(inArray(bills.id, ids));
});

test("of two copies saved at the same moment, exactly one is flagged as a duplicate of the other", async () => {
  for (let copy = 0; copy < 2; copy++)
    ids.push(await addBill({ fileName: `race-${number}.pdf`, pdf, uploadedBy: "duplicates test" }));
  await Promise.all(ids.map((id) => saveChecked(id, pdf, invoice)));
  const saved = await Promise.all(ids.map(findBill));
  const flagged = saved.filter((bill) => bill?.problems.some((problem) => problem.kind === "duplicate"));
  expect(flagged).toHaveLength(1);
  const other = saved.find((bill) => bill !== flagged[0]);
  expect(flagged[0]?.duplicateOf).toBe(other?.id ?? "");
}, 30_000);
