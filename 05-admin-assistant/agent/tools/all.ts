import type { ToolSet } from "ai";
import { draftCoupon } from "./draft-coupon";
import { listCoupons } from "./list-coupons";
import { loadSkill } from "./load-skill";
import { openNewsletter, reviseNewsletterTool } from "./newsletter-edit";
import { recentAccountsTool } from "./recent-accounts";
import { saveNewsletterDraft } from "./save-newsletter-draft";
import { signupsByDayTool } from "./signups-by-day";
import { whatsNewTool } from "./whats-new";

// Every tool, by the name a SKILL.md lists it under. Tools that save something are made for one person,
// so the Activity page records who asked. None of them changes Stripe or sends mail: people approve on the pages.
export function allTools(userId: string) {
  return {
    load_skill: loadSkill,
    signups_by_day: signupsByDayTool,
    recent_accounts: recentAccountsTool,
    list_coupons: listCoupons,
    draft_coupon: draftCoupon(userId),
    whats_new: whatsNewTool,
    save_newsletter_draft: saveNewsletterDraft(userId),
    open_newsletter: openNewsletter,
    revise_newsletter: reviseNewsletterTool(userId),
  } satisfies ToolSet;
}

export type ToolName = keyof ReturnType<typeof allTools>;
export { SAVES_SOMETHING } from "./names";
