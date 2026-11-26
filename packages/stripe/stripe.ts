import Stripe from "stripe";

// The one Stripe client. A live key outside production would touch real customers' money, so it is refused.
let client: Stripe | undefined;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. Add a test key (sk_test_) to .env.");
  if (key.startsWith("sk_live_") && process.env.NODE_ENV !== "production") {
    throw new Error("STRIPE_SECRET_KEY is a live key. Use a sk_test_ key outside production.");
  }
  client ??= new Stripe(key);
  return client;
}

// Links into the Stripe dashboard open the test-mode pages unless the key is live.
export function dashboardUrl(path: string): string {
  const live = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_");
  return `https://dashboard.stripe.com/${live ? "" : "test/"}${path}`;
}
