import { tool } from "ai";
import { z } from "zod";
import { billingPortalLink } from "../../db/billing";
import { customerOf } from "../../db/queries";

export type PortalOutput = { signedIn: false } | { signedIn: true; url: string | null };

// A link into Stripe's billing portal for the signed-in member. The assistant never changes billing itself:
// the member changes their card, switches plan or cancels there, in a new tab.
export function billingPortal(userId: string | null, returnUrl: string) {
  return tool({
    description:
      "Gives a signed-in member a button to Stripe's billing portal, where they change their card or plan, " +
      "download invoices, or cancel. The card shows the button; never write the link yourself.",
    inputSchema: z.object({}),
    execute: async (): Promise<PortalOutput> => {
      if (!userId) return { signedIn: false };
      const customerId = await customerOf(userId);
      return { signedIn: true, url: customerId ? await billingPortalLink(customerId, returnUrl) : null };
    },
  });
}
