import { tool } from "ai";
import { z } from "zod";
import { findPlan, type Plan } from "../../db/billing";
import { customerOf } from "../../db/queries";

export type PlanOutput = { signedIn: false } | { signedIn: true; plan: Plan | null };

// The signed-in visitor's own plan. The account comes from the session, never from the conversation,
// and its Stripe customer was saved at checkout, so nobody can reach someone else's plan.
export function myPlan(userId: string | null) {
  return tool({
    description: "The visitor's own plan, price and renewal date. Works only when they are signed in.",
    inputSchema: z.object({}),
    execute: async (): Promise<PlanOutput> => {
      if (!userId) return { signedIn: false };
      const customerId = await customerOf(userId);
      return { signedIn: true, plan: customerId ? await findPlan(customerId) : null };
    },
  });
}
