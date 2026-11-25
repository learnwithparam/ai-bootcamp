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
import { BILL_STATUSES, type Fix, type Role } from "../rules/bill";
import type { Invoice } from "../rules/invoice";
import type { FieldCheck } from "../rules/locate";
import type { Problem } from "../rules/match";

// All of this product's tables live in the invoice_inbox schema.
export const inbox = pgSchema("invoice_inbox");

// The purchase orders. They come from the company's order system, never from the model.
// shippedOn is null until the order is delivered.
export const purchaseOrders = inbox.table("purchase_orders", {
  orderNumber: integer("order_number").primaryKey(),
  customer: text("customer").notNull(),
  orderedOn: date("ordered_on").notNull(),
  shippedOn: date("shipped_on"),
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

export const billStatus = inbox.enum("bill_status", BILL_STATUSES);

// One row per bill: the PDF, what the model read, where each value is printed, what the rules found, and the amount to pay.
// extracted is null while the bill is being read, and stays null when it could not be read.
export const bills = inbox.table(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileName: text("file_name").notNull(),
    pdf: bytea("pdf").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    status: billStatus("status").notNull().default("reading"),
    extracted: jsonb("extracted").$type<Invoice>(),
    fields: jsonb("fields").$type<FieldCheck[]>().notNull().default([]),
    problems: jsonb("problems").$type<Problem[]>().notNull().default([]),
    fix: jsonb("fix").$type<Fix>(),
    payCents: integer("pay_cents"),
    duplicateOf: uuid("duplicate_of"),
  },
  (table) => [index("bills_status").on(table.status, table.receivedAt)],
);

// Everything that happened to a bill, in order: what the assistant did and what each person decided.
// actor is a person's name, or null for the assistant.
export const billEvents = inbox.table(
  "bill_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: uuid("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actor: text("actor"),
    text: text("text").notNull(),
  },
  (table) => [index("bill_events_bill").on(table.billId, table.at)],
);

// The accounts payable team. A new account joins as a clerk. bun 01-invoice-inbox/db/approver.ts makes an approver.
export const members = inbox.table("members", {
  userId: text("user_id").primaryKey(),
  role: text("role").$type<Role>().notNull().default("clerk"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});
