import { sql } from "drizzle-orm";
import { boolean, jsonb, pgSchema, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { CallUsage } from "../rules/cost";

// All of this product's tables live in the voice_assistant schema. Accounts are the shared "user" table.
export const clinic = pgSchema("voice_assistant");

export const physios = clinic.table("physios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  focus: text("focus").notNull(),
});

// One row per phone call, written before the caller is connected, so the limits count calls still ringing.
// "caller" is the browser's own id, from a cookie. Usage and cost are filled in when the call ends.
export const calls = clinic.table("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  caller: text("caller").notNull(),
  status: text("status", { enum: ["live", "ended"] })
    .notNull()
    .default("live"),
  endedBecause: text("ended_because"),
  seconds: real("seconds").notNull(),
  costUsd: real("cost_usd").notNull(),
  usage: jsonb("usage").$type<CallUsage>(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

// What was said on a call, line by line: the caller, the agent, and each tool the agent used.
// A line goes with its call. A booking or message the call made stays, with no call.
export const lines = clinic.table("lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id")
    .notNull()
    .references(() => calls.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["caller", "agent", "tool"] }).notNull(),
  text: text("text").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// The diary. One booked appointment per physio per start time, held by the database itself,
// so two callers asking for the same slot at once cannot both get it.
export const bookings = clinic.table(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    physioId: text("physio_id").notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
    callerName: text("caller_name").notNull(),
    phone: text("phone").notNull(),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["booked", "cancelled"] })
      .notNull()
      .default("booked"),
    callId: uuid("call_id").references(() => calls.id, { onDelete: "set null" }),
    bookedBy: text("booked_by", { enum: ["phone", "front desk"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("one_booking_per_slot").on(table.physioId, table.start).where(sql`status = 'booked'`),
  ],
);

// What the phone could not do: a caller who wants a person to ring them back.
export const messages = clinic.table("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id").references(() => calls.id, { onDelete: "set null" }),
  callerName: text("caller_name").notNull(),
  phone: text("phone").notNull(),
  note: text("note").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Who may open the front desk. Added for one account by `db/team.ts`, never by email domain.
export const team = clinic.table("team", {
  userId: text("user_id").primaryKey(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});
