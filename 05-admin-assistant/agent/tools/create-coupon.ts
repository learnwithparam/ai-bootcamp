import { tool } from "ai";
import { z } from "zod";
import { codeExists, type MadeCode, makeCode } from "../../db/coupons";
import { recordChange } from "../../db/queries";
import { couponProblem, describeCoupon } from "../../rules/coupon";

export type CreateCouponOutput =
  | ({ made: true; summary: string } & MadeCode)
  | { made: false; problem: string };

// Runs only after the owner approves this exact input on the card (see toolApproval in agent.ts).
// The limits in rules/coupon.ts are checked again here, so an approval cannot get past them.
export function createCoupon(ownerId: string) {
  return tool({
    description:
      "Make a discount code in Stripe. The owner approves it on a card first. At most 50% off, once or for 1 to 12 months.",
    inputSchema: z.object({
      code: z.string().describe("Capital letters and digits, like SPRING20"),
      percentOff: z.number().int(),
      duration: z.enum(["once", "repeating", "forever"]),
      months: z.number().int().optional().describe("Only for repeating"),
    }),
    execute: async (request): Promise<CreateCouponOutput> => {
      const problem = couponProblem(request);
      if (problem) return { made: false, problem };
      if (await codeExists(request.code))
        return { made: false, problem: `The code ${request.code} already exists.` };
      const made = await makeCode(request);
      await recordChange({ userId: ownerId, tool: "create_coupon", input: request, output: made });
      return { made: true, summary: describeCoupon(request), ...made };
    },
  });
}
