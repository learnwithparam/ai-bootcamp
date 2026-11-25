import Stripe from "stripe";

// Stripe is the record of who pays for what. The assistant reads it and never changes it:
// a member changes their own plan in Stripe's billing portal.

let client: Stripe | undefined;

// A live key outside production would touch real customers' money, so it is refused.
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. Add a test key (sk_test_) to .env.");
  if (key.startsWith("sk_live_") && process.env.NODE_ENV !== "production") {
    throw new Error("STRIPE_SECRET_KEY is a live key. Use a sk_test_ key outside production.");
  }
  client ??= new Stripe(key);
  return client;
}

export type Plan = {
  customerId: string;
  name: string;
  status: string;
  amountCents: number;
  currency: string;
  interval: string;
  renewsOn: string;
  endsAtRenewal: boolean;
};

const CURRENT = new Set(["active", "trialing", "past_due"]);

// The member's current plan, found by the email they signed in with. Null when they have none.
export async function findPlan(email: string): Promise<Plan | null> {
  const customers = await stripe().customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) return null;
  const subscriptions = await stripe().subscriptions.list({
    customer: customer.id,
    status: "all",
  });
  const subscription = subscriptions.data.find((each) => CURRENT.has(each.status));
  const item = subscription?.items.data[0];
  if (!subscription || !item) return null;
  // Stripe expands at most four levels deep, so the product is a second call.
  const product = await stripe().products.retrieve(item.price.product as string);
  return {
    customerId: customer.id,
    name: product.name,
    status: subscription.status,
    amountCents: item.price.unit_amount ?? 0,
    currency: item.price.currency,
    interval: item.price.recurring?.interval ?? "once",
    renewsOn: new Date(item.current_period_end * 1000).toISOString().slice(0, 10),
    endsAtRenewal: subscription.cancel_at_period_end,
  };
}

// A one-time link into Stripe's billing portal, where the member changes their card, plan or cancels.
export async function billingPortalLink(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}
