import { tool } from "ai";
import { z } from "zod";
import { billingPortalLink, findPlan } from "../../db/billing";

export type PortalOutput = { signedIn: false } | { signedIn: true; url: string | null };

// A link into Stripe's billing portal for the signed-in member. The assistant never changes billing itself:
// the member changes their card, switches plan or cancels there, in a new tab.
export function billingPortal(email: string | null, returnUrl: string) {
  return tool({
    description:
      "Gives a signed-in member a button to Stripe's billing portal, where they change their card or plan, " +
      "download invoices, or cancel. The card shows the button; never write the link yourself.",
    inputSchema: z.object({}),
    execute: async (): Promise<PortalOutput> => {
      if (!email) return { signedIn: false };
      const plan = await findPlan(email);
      if (!plan) return { signedIn: true, url: null };
      return { signedIn: true, url: await billingPortalLink(plan.customerId, returnUrl) };
    },
  });
}
