import { couponProblem } from "../rules/coupon";
import { codeExists, makeCode } from "./coupons";
import { claimDraft, finishDraft, returnDraft } from "./discounts";
import { recordChange } from "./queries";

export type ApproveResult = { made: true; code: string; link: string } | { made: false; problem: string };

// An owner approved a draft on the Discounts page. Only the draft's id comes from the form:
// the code, discount and length come from the saved row, and the limits are checked once more before Stripe.
export async function approveDiscountDraft(id: number, ownerId: string): Promise<ApproveResult> {
  const draft = await claimDraft(id, ownerId);
  if (!draft) return { made: false, problem: "This draft was already decided." };
  const request = {
    code: draft.code,
    percentOff: draft.percentOff,
    duration: draft.duration,
    months: draft.months ?? undefined,
  };
  const problem =
    couponProblem(request) ??
    ((await codeExists(draft.code)) ? `The code ${draft.code} already exists in Stripe.` : null);
  if (problem) {
    await returnDraft(draft.id, problem);
    return { made: false, problem };
  }
  try {
    const made = await makeCode(request);
    await finishDraft(draft.id, made);
    await recordChange({
      userId: ownerId,
      by: "person",
      action: "Approved a discount code",
      detail: { code: draft.code, couponId: made.couponId },
    });
    return { made: true, code: made.code, link: made.link };
  } catch (error) {
    console.error("admin-assistant: Stripe refused a code", error);
    const reason = "Stripe refused the code. The server log has the reason.";
    await returnDraft(draft.id, reason);
    return { made: false, problem: reason };
  }
}
