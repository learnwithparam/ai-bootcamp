import { doublePrecision, index, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Email, Form } from "../rules/email";
import type { Placed, Run, Status, Step, Verdict } from "../rules/run";
import type { Role } from "../rules/team";

// All of this product's tables live in the browser_agent schema.
export const agent = pgSchema("browser_agent");

// The firm's shared inbox: emails from people who want help. db/seed.ts loads them.
export const emails = agent.table("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per time the agent works on an email. The agent writes to it after each step, so the screen can follow.
// screen: the browser's latest picture as base64 JPEG, replaced after each step.
export const runs = agent.table(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailId: uuid("email_id")
      .notNull()
      .references(() => emails.id, { onDelete: "cascade" }),
    status: text("status").$type<Status>().notNull().default("reading"),
    form: jsonb("form").$type<Form>(),
    placed: jsonb("placed").$type<Placed[]>().notNull().default([]),
    submitSelector: text("submit_selector"),
    problems: jsonb("problems").$type<string[]>().notNull().default([]),
    verdict: jsonb("verdict").$type<Verdict>(),
    reason: text("reason"),
    decidedBy: text("decided_by"),
    requestUrl: text("request_url"),
    steps: jsonb("steps").$type<Step[]>().notNull().default([]),
    screen: text("screen"),
    cost: doublePrecision("cost").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    // Every write moves this on, so a run that stops moving can be told apart from a slow one.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("runs_email").on(table.emailId, table.createdAt), index("runs_status").on(table.status)],
);

// The intake desk: the accounts that may run the agent, and their role. Added by db/operator.ts or the seed, never a page.
export const operators = agent.table("operators", {
  userId: text("user_id").primaryKey(),
  role: text("role").$type<Role>().notNull().default("assistant"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

type RunRow = Omit<typeof runs.$inferSelect, "screen">;
type SameRun = RunRow extends Run ? (Run extends RunRow ? true : never) : never;
export const ROW_IS_RUN: SameRun = true;
type SameEmail = typeof emails.$inferSelect extends Email ? true : never;
export const ROW_IS_EMAIL: SameEmail = true;
