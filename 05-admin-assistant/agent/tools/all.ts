import type { ToolSet } from "ai";
import { createCoupon } from "./create-coupon";
import { listCoupons } from "./list-coupons";
import { loadSkill } from "./load-skill";
import { recentAccountsTool } from "./recent-accounts";
import { saveNewsletterDraft } from "./save-newsletter-draft";
import { signupsByDayTool } from "./signups-by-day";
import { whatsNewTool } from "./whats-new";

// Every tool, by the name a SKILL.md lists it under. Tools that change something are made for one owner,
// so the audit log records who asked.
export function allTools(ownerId: string) {
  return {
    load_skill: loadSkill,
    signups_by_day: signupsByDayTool,
    recent_accounts: recentAccountsTool,
    list_coupons: listCoupons,
    create_coupon: createCoupon(ownerId),
    whats_new: whatsNewTool,
    save_newsletter_draft: saveNewsletterDraft(ownerId),
  } satisfies ToolSet;
}

export type ToolName = keyof ReturnType<typeof allTools>;

// The tools that change something outside this chat. Each one waits for the owner to approve it.
export const NEEDS_APPROVAL = ["create_coupon"] as const satisfies ToolName[];
