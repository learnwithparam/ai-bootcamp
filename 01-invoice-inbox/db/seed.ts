import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pool } from "@bootcamp/db";
import { downloadInvoice, loadOrders } from "./northwind";
import { saveOrders } from "./queries";

// bun run seed invoice-inbox
// 1. Loads all 830 Northwind purchase orders into Postgres. This is the record the invoices are checked against.
// 2. Downloads 20 invoice PDFs into sample-invoices/, for you to upload in the app.

export const SAMPLE_ORDERS = Array.from({ length: 20 }, (_, index) => 10248 + index);
export const SAMPLE_FOLDER = join(import.meta.dir, "..", "sample-invoices");

async function seedOrders() {
  const orders = await loadOrders();
  await saveOrders(orders);
  console.log(`Loaded ${orders.length} purchase orders.`);
}

async function seedSampleInvoices() {
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
