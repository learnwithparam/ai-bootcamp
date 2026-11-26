import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// All of this product's tables live in the team_workspace schema.
export const workspace = pgSchema("team_workspace");

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// The accounts in the team. Added by `db/member.ts` for one account, never by email: anyone can sign up with any email.
// An admin may also add and remove connectors for everyone.
export const members = workspace.table("members", {
  userId: text("user_id").primaryKey(),
  role: text("role", { enum: ["member", "admin"] }).notNull(),
  addedAt: created(),
});

// One conversation. Only the person who started it can open it.
export const chats = workspace.table(
  "chats",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    cost: doublePrecision("cost").notNull().default(0),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chats_by_user").on(table.userId, table.updatedAt)],
);

// Each message as the chat shows it: its parts, in order. Saved after every reply.
export const messages = workspace.table(
  "messages",
  {
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    seq: integer("seq").notNull(),
    role: text("role", { enum: ["system", "user", "assistant"] }).notNull(),
    parts: jsonb("parts").notNull(),
  },
  (table) => [primaryKey({ columns: [table.chatId, table.id] })],
);

// What the assistant keeps about one person across chats. Each one is shown on /memory and can be forgotten.
export const memories = workspace.table(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    text: text("text").notNull(),
    chatId: uuid("chat_id").references(() => chats.id, { onDelete: "set null" }),
    createdAt: created(),
  },
  (table) => [index("memories_by_user").on(table.userId)],
);

// An MCP server the whole team may connect to. Only an admin adds one. The client secret is stored sealed.
export const connectors = workspace.table("connectors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  url: text("url").notNull(),
  // Who signs people in for this server, found when the admin added it. Tokens are only ever asked for there.
  issuer: text("issuer").notNull(),
  signInServer: text("sign_in_server").notNull(),
  tokenEndpoint: text("token_endpoint").notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  addedBy: text("added_by").notNull(),
  createdAt: created(),
});

// One person's link to one connector: their own tokens, sealed, and the values a sign-in needs while it is under way.
// The connector's tools run as that person, so one person's tokens never serve another.
export const connections = workspace.table(
  "connections",
  {
    connectorId: uuid("connector_id")
      .notNull()
      .references(() => connectors.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    tokens: text("tokens"),
    codeVerifier: text("code_verifier"),
    state: text("state"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.connectorId, table.userId] })],
);

export type Chat = typeof chats.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Connector = typeof connectors.$inferSelect;
