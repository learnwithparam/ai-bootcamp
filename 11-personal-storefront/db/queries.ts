import { connect } from "@bootcamp/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Product } from "../rules/catalog";
import { SECTION_TYPES, type SectionType } from "../rules/sections";
import * as schema from "./schema";
import { basketItems, personalizations, products, profiles, sectionTypes, team } from "./schema";

export const db = connect(schema);

export type Personalization = typeof personalizations.$inferSelect;
export type SavedPage = typeof profiles.$inferSelect;

export async function allProducts(): Promise<Product[]> {
  return db.select().from(products).orderBy(products.aisle);
}

export async function savedPage(owner: string): Promise<SavedPage | null> {
  const [found] = await db.select().from(profiles).where(eq(profiles.owner, owner));
  return found ?? null;
}

export async function savePage(page: Omit<SavedPage, "updatedAt">) {
  const set = { profile: page.profile, sections: page.sections, updatedAt: new Date() };
  await db.insert(profiles).values(page).onConflictDoUpdate({ target: profiles.owner, set });
}

// The kinds of section the merchandiser allows. A kind with no row yet is allowed.
export async function enabledTypes(): Promise<SectionType[]> {
  const rows = await db.select().from(sectionTypes);
  const off = new Set(rows.filter((row) => !row.enabled).map((row) => row.type));
  return SECTION_TYPES.filter((type) => !off.has(type));
}

export async function setTypeEnabled(type: SectionType, enabled: boolean) {
  await db
    .insert(sectionTypes)
    .values({ type, enabled })
    .onConflictDoUpdate({ target: sectionTypes.type, set: { enabled } });
}

export async function savePersonalization(row: typeof personalizations.$inferInsert): Promise<string> {
  const [made] = await db.insert(personalizations).values(row).returning({ id: personalizations.id });
  if (!made) throw new Error("The personalization was not saved.");
  return made.id;
}

// The basket the agent proposed with this tool call, only for the shopper it was proposed to.
export async function waitingProposal(owner: string, toolCallId: string): Promise<Personalization | null> {
  const [found] = await db
    .select()
    .from(personalizations)
    .where(
      and(
        eq(personalizations.owner, owner),
        eq(personalizations.toolCallId, toolCallId),
        eq(personalizations.basket, "waiting"),
      ),
    );
  return found ?? null;
}

// Marks the proposal answered and, on a yes, adds its lines. In one transaction, so a second click adds nothing.
export async function answerProposal(id: string, owner: string, yes: boolean) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(personalizations)
      .set({ basket: yes ? "added" : "declined" })
      .where(and(eq(personalizations.id, id), eq(personalizations.basket, "waiting")))
      .returning();
    if (!row?.proposal || !yes) return;
    for (const line of row.proposal.lines)
      await tx
        .insert(basketItems)
        .values({ owner, code: line.code, quantity: line.quantity })
        .onConflictDoUpdate({
          target: [basketItems.owner, basketItems.code],
          set: { quantity: sql`${basketItems.quantity} + ${line.quantity}` },
        });
  });
}

export async function basketOf(owner: string) {
  return db
    .select({
      code: products.code,
      name: products.name,
      image: products.image,
      pricePence: products.pricePence,
      quantity: basketItems.quantity,
    })
    .from(basketItems)
    .innerJoin(products, eq(products.code, basketItems.code))
    .where(eq(basketItems.owner, owner))
    .orderBy(products.name);
}

export async function basketSummary(owner: string) {
  const lines = await basketOf(owner);
  return {
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    totalPence: lines.reduce((sum, line) => sum + line.quantity * line.pricePence, 0),
  };
}

export async function removeFromBasket(owner: string, code: string) {
  await db.delete(basketItems).where(and(eq(basketItems.owner, owner), eq(basketItems.code, code)));
}

export async function addOne(owner: string, code: string) {
  await db
    .insert(basketItems)
    .values({ owner, code, quantity: 1 })
    .onConflictDoUpdate({
      target: [basketItems.owner, basketItems.code],
      set: { quantity: sql`${basketItems.quantity} + 1` },
    });
}

export async function recentPersonalizations(limit = 50): Promise<Personalization[]> {
  return db.select().from(personalizations).orderBy(desc(personalizations.createdAt)).limit(limit);
}

export async function personalization(id: string): Promise<Personalization | null> {
  const [found] = await db.select().from(personalizations).where(eq(personalizations.id, id));
  return found ?? null;
}

export async function isOnTeam(userId: string): Promise<boolean> {
  const found = await db.select().from(team).where(eq(team.userId, userId));
  return found.length > 0;
}

export async function addToTeam(userId: string) {
  await db.insert(team).values({ userId }).onConflictDoNothing();
}

export async function productsByCode(codes: string[]): Promise<Product[]> {
  return codes.length ? db.select().from(products).where(inArray(products.code, codes)) : [];
}

const midnight = () => new Date(new Date().setHours(0, 0, 0, 0));

// What one shopper asked today, and what the whole shop spent on the model today, for the limits in rules/state.ts.
export async function usageToday(owner: string) {
  const since = midnight();
  const [mine] = await db
    .select({ asks: sql<number>`count(*)`.mapWith(Number) })
    .from(personalizations)
    .where(and(eq(personalizations.owner, owner), sql`${personalizations.createdAt} >= ${since}`));
  const [shop] = await db
    .select({ spent: sql<number>`coalesce(sum(${personalizations.costUsd}), 0)`.mapWith(Number) })
    .from(personalizations)
    .where(sql`${personalizations.createdAt} >= ${since}`);
  return { asks: mine?.asks ?? 0, spent: shop?.spent ?? 0 };
}
