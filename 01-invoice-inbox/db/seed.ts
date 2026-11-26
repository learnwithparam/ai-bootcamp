import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pool } from "@bootcamp/db";
import { downloadInvoice, loadOrders } from "./northwind";
import { saveOrders } from "./queries";

// The record the bills are checked against, and the real invoice PDFs the seed and the tests use.
// 1. Loads all 830 Northwind purchase orders into Postgres.
// 2. Downloads invoice PDFs into sample-invoices/. Three are for orders that have not shipped yet.

export const SAMPLE_ORDERS = [
  ...Array.from({ length: 25 }, (_, index) => 10248 + index),
  11008,
  11019,
  11039,
];
export const SAMPLE_FOLDER = join(import.meta.dir, "..", "sample-invoices");

export async function seedOrders() {
  const orders = await loadOrders();
  await saveOrders(orders);
  console.log(`Loaded ${orders.length} purchase orders.`);
}

export async function seedSampleInvoices() {
  mkdirSync(SAMPLE_FOLDER, { recursive: true });
  for (const orderNumber of SAMPLE_ORDERS) {
    const path = join(SAMPLE_FOLDER, `invoice_${orderNumber}.pdf`);
    if (!existsSync(path)) writeFileSync(path, await downloadInvoice(orderNumber));
  }
  console.log(`Sample invoices are in ${SAMPLE_FOLDER}`);
}

if (import.meta.main) {
  await seedOrders();
  await seedSampleInvoices();
  await pool.end();
}
