import { index, integer, jsonb, pgSchema, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

// The catalog the tools search, and each account's saved list. Accounts live in the shared sign-in tables.
export const mcp = pgSchema("mcp_server");

export const items = mcp.table("items", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  date: text("date"),
  duration: text("duration"),
  summary: text("summary").notNull(),
});

export const saved = mcp.table(
  "saved",
  {
    userId: text("user_id").notNull(),
    url: text("url")
      .notNull()
      .references(() => items.url, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.url] })],
);

// The OAuth client the command-line app signs in as. `bun run setup` registers it once.
export const cliClient = mcp.table("cli_client", {
  clientId: text("client_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Every tool call made with an account, from every way in: the account's activity page reads it, and so does "Last used" on its apps.
// via: "page" is the tools page, "ask" is a plain-words question, "app" is an MCP client such as the CLI.
export const toolCalls = mcp.table(
  "tool_calls",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    via: text("via", { enum: ["page", "ask", "app"] }).notNull(),
    clientId: text("client_id"),
    tool: text("tool").notNull(),
    input: jsonb("input").notNull(),
    outcome: text("outcome", { enum: ["done", "failed"] }).notNull(),
    message: text("message"),
    ms: integer("ms").notNull(),
    calledAt: timestamp("called_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("tool_calls_user").on(table.userId, table.calledAt)],
);
