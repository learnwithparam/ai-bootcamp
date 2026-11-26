import { tool } from "ai";
import { z } from "zod";
import { codeExists } from "../../db/coupons";
import { openDraftWithCode, saveDiscountDraft } from "../../db/discounts";
import { recordChange } from "../../db/queries";
import { couponProblem, describeCoupon } from "../../rules/coupon";

export type DraftCouponOutput =
  | { drafted: true; draftId: number; code: string; summary: string }
  | { drafted: false; problem: string };

// Saves a proposed code on the Discounts page. Nothing is made in Stripe: an owner approves the draft there.
// The limits in rules/coupon.ts are checked here, and again when the owner approves.
export function draftCoupon(userId: string) {
  return tool({
    description:
      "Propose a discount code. It is saved as a draft on the Discounts page for an owner to approve. At most 50% off, once or for 1 to 12 months.",
    inputSchema: z.object({
      code: z.string().describe("Capital letters and digits, like SPRING20"),
      percentOff: z.number().int(),
      duration: z.enum(["once", "repeating", "forever"]),
      months: z.number().int().optional().describe("Only for repeating"),
    }),
    execute: async (request): Promise<DraftCouponOutput> => {
      const problem = couponProblem(request);
      if (problem) return { drafted: false, problem };
      if ((await codeExists(request.code)) || (await openDraftWithCode(request.code)))
        return { drafted: false, problem: `The code ${request.code} already exists or waits as a draft.` };
      const draft = await saveDiscountDraft(request, userId);
      await recordChange({
        userId,
        by: "assistant",
        action: "Drafted a discount code",
        detail: { code: draft.code, draftId: draft.id },
      });
      return { drafted: true, draftId: draft.id, code: draft.code, summary: describeCoupon(request) };
    },
  });
}
