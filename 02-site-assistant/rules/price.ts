// How a Stripe price reads on screen: 14900 usd year becomes "$149 a year". Plain code, no AI.

export function formatPrice(amountCents: number, currency: string, interval: string): string {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100);
  return interval === "once" ? amount : `${amount} a ${interval}`;
}
