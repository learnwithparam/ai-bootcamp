import { doublePrecision, index, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { PartyRecord } from "../rules/conflicts";
import type { Assessment, Conflict, Decision, Intake, Status } from "../rules/intake";

// All of this product's tables live in the legal_intake schema. The graph's own checkpoints live in
// legal_intake_graph, written by LangGraph, so a paused request survives a restart.
export const legal = pgSchema("legal_intake");

// One row per client request. The graph writes to it after each step, so the screens never read checkpoints.
// tokenHash: the client's private link holds a random token. Only its hash is kept, so a leaked table opens nothing.
export const intakes = legal.table(
  "intakes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").notNull(),
    otherParties: jsonb("other_parties").$type<string[]>().notNull(),
    story: text("story").notNull(),
    status: text("status").$type<Status>().notNull().default("assessing"),
    assessment: jsonb("assessment").$type<Assessment>(),
    conflicts: jsonb("conflicts").$type<Conflict[]>().notNull().default([]),
    decision: jsonb("decision").$type<Decision>(),
    draft: text("draft"),
    letter: text("letter"),
    cost: doublePrecision("cost").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    index("intakes_status").on(table.status, table.createdAt),
    index("intakes_email").on(table.clientEmail),
  ],
);

// Everyone the firm has acted for or against. The conflict check reads this.
export const parties = legal.table("parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role").$type<PartyRecord["role"]>().notNull(),
  matter: text("matter").notNull(),
});

// The accounts that may open the review queue. Added by db/lawyer.ts, never by a page.
export const lawyers = legal.table("lawyers", {
  userId: text("user_id").primaryKey(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

type Row = Omit<typeof intakes.$inferSelect, "tokenHash">;
type Same = Row extends Intake ? (Intake extends Row ? true : never) : never;
export const ROW_IS_INTAKE: Same = true;
