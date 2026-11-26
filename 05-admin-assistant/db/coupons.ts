import { dashboardUrl, stripe } from "@bootcamp/stripe";
import type { CouponRequest } from "../rules/coupon";

// Discount codes live in Stripe. A coupon holds the discount; a promotion code is the word a customer types.

export type CodeSummary = {
  id: string;
  code: string;
  active: boolean;
  percentOff: number | null;
  duration: string;
  months: number | null;
  timesUsed: number;
};

export type MadeCode = { code: string; couponId: string; promotionCodeId: string; link: string };

export async function listCodes(limit = 20): Promise<CodeSummary[]> {
  const found = await stripe().promotionCodes.list({ limit, expand: ["data.promotion.coupon"] });
  // A code whose coupon was deleted can never be used again, so it is left out.
  const live = found.data.filter(
    (each) => typeof each.promotion.coupon === "object" && each.promotion.coupon?.percent_off != null,
  );
  return live.map((each) => {
    const coupon = typeof each.promotion.coupon === "object" ? each.promotion.coupon : null;
    return {
      id: each.id,
      code: each.code,
      active: each.active,
      percentOff: coupon?.percent_off ?? null,
      duration: coupon?.duration ?? "unknown",
      months: coupon?.duration_in_months ?? null,
      timesUsed: each.times_redeemed,
    };
  });
}

// Stripe keeps a code after it is turned off, and only active codes must be unique, so only those count.
export async function codeExists(code: string): Promise<boolean> {
  const found = await stripe().promotionCodes.list({ code, active: true, limit: 1 });
  return found.data.length > 0;
}

export async function makeCode(request: CouponRequest): Promise<MadeCode> {
  const coupon = await stripe().coupons.create({
    name: request.code,
    percent_off: request.percentOff,
    duration: request.duration,
    ...(request.duration === "repeating" ? { duration_in_months: request.months } : {}),
  });
  const promotionCode = await stripe().promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    code: request.code,
  });
  return {
    code: promotionCode.code,
    couponId: coupon.id,
    promotionCodeId: promotionCode.id,
    link: dashboardUrl(`coupons/${coupon.id}`),
  };
}

// Only the tests call this, to leave Stripe as they found it.
export async function removeCode(made: MadeCode) {
  await stripe().promotionCodes.update(made.promotionCodeId, { active: false });
  await stripe().coupons.del(made.couponId);
}
