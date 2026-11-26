import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { CouponRequest } from "../rules/coupon";
import { db } from "./queries";
import { type DiscountDraft, discountDrafts } from "./schema";

export async function saveDiscountDraft(request: CouponRequest, askedBy: string): Promise<DiscountDraft> {
  const [row] = await db
    .insert(discountDrafts)
    .values({
      code: request.code,
      percentOff: request.percentOff,
      duration: request.duration as "once" | "repeating",
      months: request.months ?? null,
      askedBy,
    })
    .returning();
  if (!row) throw new Error("The discount draft was not saved.");
  return row;
}

// Drafts waiting for an owner, and the ones being made right now, newest first.
export async function openDiscountDrafts(): Promise<DiscountDraft[]> {
  return db
    .select()
    .from(discountDrafts)
    .where(inArray(discountDrafts.status, ["draft", "making"]))
    .orderBy(desc(discountDrafts.createdAt));
}

export async function openDraftWithCode(code: string): Promise<DiscountDraft | null> {
  const [row] = await db
    .select()
    .from(discountDrafts)
    .where(and(eq(discountDrafts.code, code), inArray(discountDrafts.status, ["draft", "making"])));
  return row ?? null;
}

// Moves a draft to "making" only if it is still a draft. The second of two clicks gets null and stops.
export async function claimDraft(id: number, ownerId: string): Promise<DiscountDraft | null> {
  const [row] = await db
    .update(discountDrafts)
    .set({ status: "making", decidedBy: ownerId })
    .where(and(eq(discountDrafts.id, id), eq(discountDrafts.status, "draft")))
    .returning();
  return row ?? null;
}

export async function finishDraft(
  id: number,
  made: { couponId: string; promotionCodeId: string; link: string },
) {
  await db
    .update(discountDrafts)
    .set({ status: "made", ...made, decidedAt: sql`now()` })
    .where(eq(discountDrafts.id, id));
}

// A draft Stripe or the rules refused goes back to waiting, with the reason on the row.
export async function returnDraft(id: number, problem: string) {
  await db
    .update(discountDrafts)
    .set({ status: "draft", problem, decidedBy: null })
    .where(eq(discountDrafts.id, id));
}

export async function discardDraft(id: number, ownerId: string): Promise<boolean> {
  const rows = await db
    .update(discountDrafts)
    .set({ status: "discarded", decidedBy: ownerId, decidedAt: sql`now()` })
    .where(and(eq(discountDrafts.id, id), eq(discountDrafts.status, "draft")))
    .returning({ id: discountDrafts.id });
  return rows.length > 0;
}
