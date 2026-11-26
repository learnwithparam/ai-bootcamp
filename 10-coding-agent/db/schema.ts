import { doublePrecision, index, integer, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Role, Verdict } from "../rules/review";
import type { Check, Outcome, SessionEvent } from "../rules/session";

// All of this product's tables live in the coding_agent schema.
export const coding = pgSchema("coding_agent");

// The team: the accounts that may use the review site, and their role. Added by db/member.ts or the seed, never a page.
export const members = coding.table("members", {
  userId: text("user_id").primaryKey(),
  role: text("role").$type<Role>().notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per uploaded run. events is the whole session file. The other columns are worked out from it
// by summarize() when it arrives, so the list can sort and filter without reading every file.
export const runs = coding.table(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    task: text("task").notNull(),
    repo: text("repo").notNull(),
    commit: text("commit").notNull(),
    checkCommand: text("check_command").notNull(),
    outcome: text("outcome").$type<Outcome>().notNull(),
    reason: text("reason").notNull(),
    steps: integer("steps").notNull(),
    cost: doublePrecision("cost").notNull(),
    blocked: integer("blocked").notNull(),
    filesChanged: integer("files_changed").notNull(),
    diff: text("diff").notNull(),
    checkBefore: jsonb("check_before").$type<Check | null>(),
    checkAfter: jsonb("check_after").$type<Check | null>(),
    events: jsonb("events").$type<SessionEvent[]>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("runs_uploaded").on(table.uploadedAt), index("runs_user").on(table.userId)],
);

// Every review ever given. The newest one for a run is its state, and the older ones stay as its history.
export const reviews = coding.table(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id").notNull(),
    verdict: text("verdict").$type<Verdict>().notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reviews_run").on(table.runId, table.createdAt)],
);
