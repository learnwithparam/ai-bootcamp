import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { CaseDetail, CaseScores, RunSummary } from "../rules/eval-types";
import type { StoredMessage } from "../rules/message";

export * from "./data-schema";

// The product's own tables: saved chats and eval runs.
export const app = pgSchema("marketplace_analyst");

export const conversations = app.table(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conversations_user").on(t.userId, t.updatedAt)],
);

export const messages = app.table(
  "messages",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    seq: integer("seq").notNull(),
    message: jsonb("message").$type<StoredMessage>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.id] }),
    uniqueIndex("messages_order").on(t.conversationId, t.seq),
  ],
);

// One row per run of the eval set, and one per case in it. The Evals page reads only these.
export const evalRuns = app.table("eval_runs", {
  id: serial("id").primaryKey(),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  summary: jsonb("summary").$type<RunSummary>().notNull(),
  passed: boolean("passed").notNull(),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6, mode: "number" }).notNull(),
});

export const evalResults = app.table(
  "eval_results",
  {
    runId: integer("run_id")
      .notNull()
      .references(() => evalRuns.id, { onDelete: "cascade" }),
    caseId: text("case_id").notNull(),
    question: text("question").notNull(),
    passed: boolean("passed").notNull(),
    scores: jsonb("scores").$type<CaseScores>().notNull(),
    detail: jsonb("detail").$type<CaseDetail>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.caseId] })],
);
