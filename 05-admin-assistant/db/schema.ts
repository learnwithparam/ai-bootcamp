import { integer, jsonb, pgSchema, serial, text, timestamp } from "drizzle-orm/pg-core";

// All of this product's tables live in the admin_assistant schema. The accounts themselves are the shared "user" table.
export const admin = pgSchema("admin_assistant");

// Who may open the admin. Added by `db/team.ts` for one account, never by email: anyone can sign up with any email.
// An owner approves discount codes and newsletters. Staff can do everything else.
export const team = admin.table("team", {
  userId: text("user_id").primaryKey(),
  role: text("role", { enum: ["owner", "staff"] }).notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

// Newsletter issues. The assistant writes and edits them, a person approves them, and nobody here sends them.
// The text before the assistant's last edit is kept, so the editor can show that edit as a diff and undo it.
export const newsletters = admin.table("newsletters", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["draft", "approved"] })
    .notNull()
    .default("draft"),
  previousSubject: text("previous_subject"),
  previousBody: text("previous_body"),
  writtenBy: text("written_by").notNull(),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// A discount code the assistant proposed. It exists only here until an owner approves it on the Discounts page.
// "making" is held while Stripe is called, so two clicks cannot make the code twice.
export const discountDrafts = admin.table("discount_drafts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  percentOff: integer("percent_off").notNull(),
  duration: text("duration", { enum: ["once", "repeating"] }).notNull(),
  months: integer("months"),
  status: text("status", { enum: ["draft", "making", "made", "discarded"] })
    .notNull()
    .default("draft"),
  askedBy: text("asked_by").notNull(),
  decidedBy: text("decided_by"),
  couponId: text("coupon_id"),
  promotionCodeId: text("promotion_code_id"),
  link: text("link"),
  problem: text("problem"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

// Everything the assistant or a person changed, newest first on the Activity page.
export const changes = admin.table("changes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  by: text("by", { enum: ["assistant", "person"] }).notNull(),
  action: text("action").notNull(),
  detail: jsonb("detail").notNull(),
  madeAt: timestamp("made_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Role = (typeof team.$inferSelect)["role"];
export type Newsletter = typeof newsletters.$inferSelect;
export type DiscountDraft = typeof discountDrafts.$inferSelect;
export type Change = typeof changes.$inferSelect;
