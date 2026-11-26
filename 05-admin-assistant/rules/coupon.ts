// The limits on a coupon, in plain code. The model can ask for anything and the owner can approve it,
// but a coupon outside these limits is refused before Stripe is called.

export const MAX_PERCENT_OFF = 50;
export const MAX_MONTHS = 12;

export type CouponRequest = {
  code: string;
  percentOff: number;
  duration: "once" | "repeating" | "forever";
  months?: number;
};

const CODE = /^[A-Z0-9]{4,20}$/;

// Returns what is wrong with the request, or null when it may be made.
export function couponProblem(request: CouponRequest): string | null {
  if (!CODE.test(request.code))
    return "The code must be 4 to 20 capital letters or digits, like BLACKFRIDAY20.";
  if (!Number.isInteger(request.percentOff) || request.percentOff < 1)
    return "The discount must be a whole percent.";
  if (request.percentOff > MAX_PERCENT_OFF) return `The largest discount allowed is ${MAX_PERCENT_OFF}%.`;
  if (request.duration === "forever")
    return "A coupon that never ends is not allowed. Pick once or a number of months.";
  if (request.duration === "repeating") {
    const months = request.months ?? 0;
    if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) {
      return `A repeating coupon lasts 1 to ${MAX_MONTHS} months.`;
    }
  }
  return null;
}

// How the coupon reads to a person, on the approval card and in the reply.
export function describeCoupon(request: CouponRequest): string {
  const length =
    request.duration === "once"
      ? "on the first payment"
      : `for ${request.months} month${request.months === 1 ? "" : "s"}`;
  return `${request.percentOff}% off ${length}, with the code ${request.code}`;
}
