import { jsonb, pgSchema, serial, text, timestamp } from "drizzle-orm/pg-core";

// All of this product's tables live in the admin_assistant schema.
export const admin = pgSchema("admin_assistant");

// The accounts that may use the admin assistant. Added by `db/owner.ts` for one account, never by email:
// anyone can sign up with any email.
export const owners = admin.table("owners", {
  userId: text("user_id").primaryKey(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

// Newsletter drafts the assistant wrote. A person reads and sends them; the assistant never sends.
export const drafts = admin.table("drafts", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  writtenFor: text("written_for").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Every change the assistant made, who approved it, and what came back. Read it to see what happened and when.
export const changes = admin.table("changes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  tool: text("tool").notNull(),
  input: jsonb("input").notNull(),
  output: jsonb("output").notNull(),
  madeAt: timestamp("made_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Draft = typeof drafts.$inferSelect;
export type Change = typeof changes.$inferSelect;
