import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Line, Proposal } from "../rules/basket";
import type { Aisle, Allergen } from "../rules/catalog";
import type { Profile } from "../rules/profile";
import type { Removed, Section } from "../rules/sections";

// All of this product's tables live in the personal_storefront schema. Accounts are the shared "user" table.
export const shop = pgSchema("personal_storefront");

// The shelves, from Open Food Facts, with Fernhill's own prices. The seed loads them from db/products.json.
export const products = shop.table("products", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  quantity: text("quantity").notNull(),
  aisle: text("aisle").$type<Aisle>().notNull(),
  image: text("image").notNull(),
  allergens: text("allergens").array().$type<Allergen[]>().notNull(),
  traces: text("traces").array().$type<Allergen[]>().notNull(),
  diet: text("diet", { enum: ["vegan", "vegetarian", "neither", "unknown"] }).notNull(),
  nutriscore: text("nutriscore").notNull(),
  pricePence: integer("price_pence").notNull(),
});

// "owner" is "user:<id>" for a signed-in shopper, or "guest:<id>" for the cookie a guest is given.
// A shopper's profile and their page as it was last laid out, so a returning shopper sees their own page.
export const profiles = shop.table("profiles", {
  owner: text("owner").primaryKey(),
  profile: jsonb("profile").$type<Profile>().notNull(),
  sections: jsonb("sections").$type<Section[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per time the agent laid out a page: what was said, what it believed, what it drew,
// what the rules took out, and what it cost. The merchandiser reads these.
// A basket the agent proposed waits here until the shopper presses Add all, so the browser never sends prices.
export const personalizations = shop.table("personalizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  owner: text("owner").notNull(),
  said: text("said").notNull(),
  reply: text("reply").notNull(),
  profile: jsonb("profile").$type<Profile>().notNull(),
  sections: jsonb("sections").$type<Section[]>().notNull(),
  removed: jsonb("removed").$type<Removed[]>().notNull(),
  dropped: jsonb("dropped").$type<string[]>().notNull(),
  proposal: jsonb("proposal").$type<Proposal>(),
  toolCallId: text("tool_call_id"),
  basket: text("basket", { enum: ["none", "waiting", "added", "declined"] })
    .notNull()
    .default("none"),
  costUsd: real("cost_usd").notNull(),
  seconds: real("seconds").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const basketItems = shop.table(
  "basket_items",
  {
    owner: text("owner").notNull(),
    code: text("code").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [primaryKey({ columns: [table.owner, table.code] })],
);

// Which kinds of section the agent may use. The merchandiser switches them on and off.
export const sectionTypes = shop.table("section_types", {
  type: text("type").primaryKey(),
  enabled: boolean("enabled").notNull(),
});

// Who may open Merchandising. Added for one account by `db/team.ts`, never by email domain.
export const team = shop.table("team", {
  userId: text("user_id").primaryKey(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BasketLine = Line;
