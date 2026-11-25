import { findPlan, stripe } from "./billing";

// bun 02-site-assistant/db/member.ts you@example.com
// Makes the email a paying Pro member in your Stripe test account, so you can try the plan card.
// It uses Stripe's test card, so no money moves. Sign in to the assistant with the same email.

const LOOKUP_KEY = "bootcamp_pro_yearly";

async function proPrice(): Promise<string> {
  const found = await stripe().prices.list({ lookup_keys: [LOOKUP_KEY], active: true });
  if (found.data[0]) return found.data[0].id;
  const price = await stripe().prices.create({
    lookup_key: LOOKUP_KEY,
    currency: "usd",
    unit_amount: 14_900,
    recurring: { interval: "year" },
    product_data: { name: "Pro (yearly)" },
  });
  return price.id;
}

async function customerFor(email: string): Promise<string> {
  const found = await stripe().customers.list({ email, limit: 1 });
  if (found.data[0]) return found.data[0].id;
  const customer = await stripe().customers.create({ email });
  const card = await stripe().paymentMethods.attach("pm_card_visa", { customer: customer.id });
  await stripe().customers.update(customer.id, { invoice_settings: { default_payment_method: card.id } });
  return customer.id;
}

// Returns the member's plan. Safe to run twice: it reuses the price, the customer and the subscription.
export async function makeMember(email: string) {
  if (!(await findPlan(email))) {
    const customer = await customerFor(email);
    await stripe().subscriptions.create({ customer, items: [{ price: await proPrice() }] });
  }
  return findPlan(email);
}

if (import.meta.main) {
  const email = process.argv[2];
  if (!email?.includes("@")) throw new Error("Usage: bun 02-site-assistant/db/member.ts you@example.com");
  const plan = await makeMember(email);
  console.log(`${email} is on ${plan?.name}, ${plan?.status}, renews on ${plan?.renewsOn}.`);
}
