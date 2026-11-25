import { tool } from "ai";
import { z } from "zod";
import { findPlan, type Plan } from "../../db/billing";

export type PlanOutput = { signedIn: false } | { signedIn: true; plan: Omit<Plan, "customerId"> | null };

// The signed-in visitor's own plan, read from Stripe by the email they signed in with.
// The email comes from the session, never from the conversation, so nobody can ask about someone else's plan.
export function myPlan(email: string | null) {
  return tool({
    description: "The visitor's own plan, price and renewal date. Works only when they are signed in.",
    inputSchema: z.object({}),
    execute: async (): Promise<PlanOutput> => {
      if (!email) return { signedIn: false };
      const plan = await findPlan(email);
      if (!plan) return { signedIn: true, plan: null };
      const { customerId: _hidden, ...shown } = plan;
      return { signedIn: true, plan: shown };
    },
  });
}
