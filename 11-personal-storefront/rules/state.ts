import type { Profile } from "./profile";
import type { Section } from "./sections";

// The state the agent and the page share over AG-UI. The agent sends it whole at the start of a run,
// then one change at a time as JSON Patch, so each section appears on the page the moment it is checked.

export type ShopState = {
  profile: Profile;
  sections: Section[];
  // What the agent is doing now, in plain words, or null when it is done.
  working: string | null;
  basket: { count: number; totalPence: number };
};

export type Patch = { op: "add" | "replace"; path: string; value: unknown };

export const addSection = (section: Section): Patch => ({ op: "add", path: "/sections/-", value: section });
export const setWorking = (working: string | null): Patch => ({
  op: "replace",
  path: "/working",
  value: working,
});
export const setBasket = (basket: ShopState["basket"]): Patch => ({
  op: "replace",
  path: "/basket",
  value: basket,
});

// How many times one shopper may ask the agent in a day. Each ask is a few model calls, and this is a public page.
export const ASKS_PER_DAY = 40;
export const LONGEST_ASK = 500;
// What the whole shop may spend on the model in a day, in dollars. A cleared cookie makes a new guest,
// so the per-shopper count alone cannot bound the bill; this can.
export const SHOP_SPEND_PER_DAY = 3;

export function limitMessage(usage: { asks: number; spent: number }): string | null {
  if (usage.asks >= ASKS_PER_DAY) return "You have changed your page a lot today. Try again tomorrow.";
  if (usage.spent >= SHOP_SPEND_PER_DAY)
    return "The shop has rearranged a lot of pages today. Try again tomorrow.";
  return null;
}
