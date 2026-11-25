import { doublePrecision, index, integer, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Role } from "../rules/board";
import type { Draft } from "../rules/collect";
import type { PartyRecord } from "../rules/conflicts";
import type { Assessment, Conflict, Deadline, Decision, Intake, Status, Turn } from "../rules/intake";

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
    keyDate: jsonb("key_date").$type<Deadline>(),
    goal: text("goal").notNull().default(""),
    story: text("story").notNull(),
    transcript: jsonb("transcript").$type<Turn[]>().notNull().default([]),
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

// The firm's staff: the accounts that may open the intake board. Added by db/lawyer.ts, never by a page.
// role: a paralegal sees every request; only a lawyer decides or approves.
export const lawyers = legal.table("lawyers", {
  userId: text("user_id").primaryKey(),
  role: text("role").$type<Role>().notNull().default("lawyer"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

// A conversation on the public intake page, before it is sent. The server keeps the transcript, so a page
// cannot forge the agent's questions, and the turn limits count what was really asked.
// visitorHash: a hash of the visitor's address, kept only to count their turns for the daily limit.
export const conversations = legal.table(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitorHash: text("visitor_hash").notNull(),
    transcript: jsonb("transcript").$type<Turn[]>().notNull().default([]),
    draft: jsonb("draft").$type<Draft>().notNull(),
    turns: integer("turns").notNull().default(0),
    cost: doublePrecision("cost").notNull().default(0),
    intakeId: uuid("intake_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("conversations_visitor").on(table.visitorHash, table.createdAt)],
);

type Row = Omit<typeof intakes.$inferSelect, "tokenHash">;
type Same = Row extends Intake ? (Intake extends Row ? true : never) : never;
export const ROW_IS_INTAKE: Same = true;
