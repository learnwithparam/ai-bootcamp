import {
  customType,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Invoice } from "../rules/invoice";
import { INVOICE_STATUSES, type Problem } from "../rules/match";

// All of this product's tables live in the invoice_inbox schema.
export const inbox = pgSchema("invoice_inbox");

// The purchase orders. They come from the company's order system, never from the model.
export const purchaseOrders = inbox.table("purchase_orders", {
  orderNumber: integer("order_number").primaryKey(),
  customer: text("customer").notNull(),
  orderedOn: date("ordered_on").notNull(),
});

// Prices are whole cents, so sums are exact. A discount is a whole percent, for example 15.
export const orderLines = inbox.table(
  "order_lines",
  {
    orderNumber: integer("order_number")
      .notNull()
      .references(() => purchaseOrders.orderNumber),
    product: text("product").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    discountPercent: integer("discount_percent").notNull(),
  },
  (table) => [primaryKey({ columns: [table.orderNumber, table.product] })],
);

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const invoiceStatus = inbox.enum("invoice_status", INVOICE_STATUSES);

// One row per uploaded invoice: the PDF, what the model read from it, and what the rules found.
export const invoices = inbox.table(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileName: text("file_name").notNull(),
    pdf: bytea("pdf").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    extracted: jsonb("extracted").$type<Invoice>().notNull(),
    problems: jsonb("problems").$type<Problem[]>().notNull(),
    status: invoiceStatus("status").notNull(),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => [index("invoices_status").on(table.status, table.uploadedAt)],
);
