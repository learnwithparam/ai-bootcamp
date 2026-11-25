import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  real,
  serial,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";

// All of this product's tables live in the site_assistant schema.
export const site = pgSchema("site_assistant");

// One row per page of learnwithparam.com that the assistant may quote.
export const pages = site.table("pages", {
  url: text("url").primaryKey(),
  title: text("title").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

// A page cut into sections at its headings. Each section has an embedding: 1536 numbers that place
// its meaning, so a question finds the sections closest to it.
export const sections = site.table(
  "sections",
  {
    id: serial("id").primaryKey(),
    url: text("url")
      .notNull()
      .references(() => pages.url, { onDelete: "cascade" }),
    heading: text("heading").notNull(),
    body: text("body").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  },
  (table) => [index("sections_embedding").using("hnsw", table.embedding.op("vector_cosine_ops"))],
);

// A visitor who asked for a person. The support queue lists the open ones, oldest first.
export const tickets = site.table("tickets", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  summary: text("summary").notNull(),
  conversation: jsonb("conversation").$type<{ role: string; text: string }[]>().notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  answeredBy: text("answered_by"),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
});

// One row per answered question: who asked, which action the decision model chose, and what it cost.
// The limits count these rows, so a visitor's minute and the day's spend come from Postgres.
export const turns = site.table(
  "turns",
  {
    id: serial("id").primaryKey(),
    visitor: text("visitor").notNull(),
    action: text("action").notNull(),
    confidence: real("confidence").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6, mode: "number" }).notNull().default(0),
    citedPages: integer("cited_pages").notNull().default(0),
    badCitations: integer("bad_citations").notNull().default(0),
    askedAt: timestamp("asked_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [index("turns_visitor_time").on(table.visitor, table.askedAt)],
);

// Who pays: the Stripe customer of each account, saved when that account checks out.
// It is keyed by the account, never by an email: anyone can sign up with an email they do not own.
export const members = site.table("members", {
  userId: text("user_id").primaryKey(),
  customerId: text("customer_id").notNull().unique(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

// The accounts that may read the support queue, added one by one with `db/support.ts`.
export const supportTeam = site.table("support_team", {
  userId: text("user_id").primaryKey(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});
