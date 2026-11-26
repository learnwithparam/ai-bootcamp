import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";
import type { StoredMessage } from "../rules/conversation";

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

// One messenger conversation. The assistant owns it until it hands off, then the support team does.
// visitor is the signed-in account or the browser's own cookie, so nobody opens someone else's conversation.
export const conversations = site.table(
  "conversations",
  {
    id: text("id").primaryKey(),
    visitor: text("visitor").notNull(),
    userId: text("user_id"),
    name: text("name"),
    email: text("email"),
    startedOn: text("started_on").notNull(),
    owner: text("owner").$type<"assistant" | "team">().notNull().default("assistant"),
    summary: text("summary"),
    handedOffAt: timestamp("handed_off_at", { withTimezone: true }),
    assigneeId: text("assignee_id"),
    assigneeName: text("assignee_name"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("conversations_visitor").on(table.visitor, table.updatedAt)],
);

// Every message of a conversation, in order. A teammate's reply is an assistant message whose metadata
// names the teammate, so the messenger shows who wrote it.
export const messages = site.table(
  "messages",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    seq: integer("seq").notNull(),
    message: jsonb("message").$type<StoredMessage>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.id] }),
    uniqueIndex("messages_order").on(table.conversationId, table.seq),
  ],
);

// One row per answered question: who asked, which action the decision model chose, and what it cost.
// The limits count these rows, so a visitor's minute and the day's spend come from Postgres.
export const turns = site.table(
  "turns",
  {
    id: serial("id").primaryKey(),
    visitor: text("visitor").notNull(),
    conversationId: text("conversation_id"),
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

// The accounts that may read the support inbox, added one by one with `db/support.ts`.
export const supportTeam = site.table("support_team", {
  userId: text("user_id").primaryKey(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});
