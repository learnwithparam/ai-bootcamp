import { doublePrecision, index, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CheckedClaim } from "../rules/claims";
import type { Identity, Report, Status } from "../rules/report";
import type { Facts, Score } from "../rules/score";
import type { Role } from "../rules/team";

// All of this product's tables live in the research_agent schema.
export const research = pgSchema("research_agent");

// One row per account on the team table. The graph writes to it as each topic finishes, so its cells fill in live.
export const reports = research.table(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    company: text("company").notNull(),
    createdBy: text("created_by").notNull(),
    ownerId: text("owner_id"),
    status: text("status").$type<Status>().notNull().default("running"),
    step: text("step").notNull().default("Starting"),
    identity: jsonb("identity").$type<Identity>(),
    claims: jsonb("claims").$type<CheckedClaim[]>().notNull().default([]),
    topicsDone: jsonb("topics_done").$type<string[]>().notNull().default([]),
    facts: jsonb("facts").$type<Facts>(),
    score: jsonb("score").$type<Score>(),
    cost: doublePrecision("cost").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("reports_created_by").on(table.createdBy, table.createdAt),
    index("reports_owner").on(table.ownerId),
  ],
);

// The sales team. A new account joins as a rep. bun 06-research-agent/db/lead.ts makes a sales lead.
export const members = research.table("members", {
  userId: text("user_id").primaryKey(),
  role: text("role").$type<Role>().notNull().default("rep"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

// A row from the table must be a Report as the screens read it. This line fails to compile if they drift apart.
export type Row = typeof reports.$inferSelect;
export type { Report };

type Same = Row extends Report ? (Report extends Row ? true : never) : never;
export const ROW_IS_REPORT: Same = true;
