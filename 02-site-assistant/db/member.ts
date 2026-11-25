import { findPlan, stripe } from "./billing";
import { accountByEmail, customerOf, saveMember } from "./queries";

// bun 02-site-assistant/db/member.ts you@example.com
// Stands in for checkout: it gives an existing account a paid Pro plan in your Stripe test account,
// and saves that account's Stripe customer, as a real checkout would. Stripe's test card means no money moves.

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

// A Stripe test customer paying for Pro with Stripe's test card. It is not tied to any account here.
export async function payingCustomer(email: string, metadata: Record<string, string> = {}): Promise<string> {
  const customer = await stripe().customers.create({ email, metadata });
  const card = await stripe().paymentMethods.attach("pm_card_visa", { customer: customer.id });
  await stripe().customers.update(customer.id, { invoice_settings: { default_payment_method: card.id } });
  await stripe().subscriptions.create({ customer: customer.id, items: [{ price: await proPrice() }] });
  return customer.id;
}

async function newCustomer(userId: string, email: string): Promise<string> {
  const customerId = await payingCustomer(email, { user_id: userId });
  await saveMember(userId, customerId);
  return customerId;
}

// Safe to run twice: it reuses the price, the customer and the subscription.
export async function makeMember(email: string) {
  const account = await accountByEmail(email);
  if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
  const customerId = (await customerOf(account.id)) ?? (await newCustomer(account.id, account.email));
  if (!(await findPlan(customerId))) {
    await stripe().subscriptions.create({ customer: customerId, items: [{ price: await proPrice() }] });
  }
  return { customerId, plan: await findPlan(customerId) };
}

if (import.meta.main) {
  const email = process.argv[2];
  if (!email?.includes("@")) throw new Error("Usage: bun 02-site-assistant/db/member.ts you@example.com");
  const { plan } = await makeMember(email);
  console.log(`${email} is on ${plan?.name}, ${plan?.status}, renews on ${plan?.renewsOn}.`);
  process.exit(0);
}
