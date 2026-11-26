import { z } from "zod";
import { AISLES, ALLERGEN_WORDS, ALLERGENS, labelledDiet, type Product } from "./catalog";

// What the shop knows about one shopper. The shopper and the agent both write it: the agent from what
// they say, the shopper by tapping a chip. The rules below read it, and they decide what may be shown.

export const ProfileSchema = z.object({
  diet: z.enum(["vegan", "vegetarian", "any"]),
  avoid: z.array(z.enum(ALLERGENS)),
  // The weekly budget in pence, or null when the shopper gave none.
  budgetPence: z.number().int().positive().nullable(),
  people: z.number().int().min(1).max(12),
  likes: z.array(z.enum(AISLES)),
  // The language the shopper writes in, as a code like "en" or "es". Section titles and replies use it.
  language: z.string().min(2).max(8),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const NEW_PROFILE: Profile = {
  diet: "any",
  avoid: [],
  budgetPence: null,
  people: 1,
  likes: [],
  language: "en",
};

// Why a product may not be shown to this shopper, or null when it may.
export function whyNot(product: Product, profile: Profile): string | null {
  for (const allergen of profile.avoid) {
    if (product.allergens.includes(allergen)) return `contains ${ALLERGEN_WORDS[allergen]}`;
    if (product.traces.includes(allergen)) return `may contain ${ALLERGEN_WORDS[allergen]}`;
  }
  // A diet we cannot confirm from the label is treated as not met.
  const diet = labelledDiet(product);
  if (profile.diet === "vegan" && diet !== "vegan") return "not labelled vegan";
  if (profile.diet === "vegetarian" && diet !== "vegan" && diet !== "vegetarian")
    return "not labelled vegetarian";
  return null;
}

export const allowed = (product: Product, profile: Profile) => whyNot(product, profile) === null;

// The chips on the page, in plain words, so the shopper can see and undo what the shop believes.
export function chips(profile: Profile): { key: string; label: string }[] {
  const shown: { key: string; label: string }[] = [];
  if (profile.diet !== "any")
    shown.push({ key: "diet", label: profile.diet === "vegan" ? "Vegan" : "Vegetarian" });
  for (const allergen of profile.avoid)
    shown.push({ key: `avoid:${allergen}`, label: `No ${ALLERGEN_WORDS[allergen]}` });
  if (profile.budgetPence)
    shown.push({ key: "budget", label: `Under £${Math.round(profile.budgetPence / 100)} a week` });
  if (profile.people > 1) shown.push({ key: "people", label: `For ${profile.people}` });
  return shown;
}

// Tapping a chip's cross takes that one belief away.
export function withoutChip(profile: Profile, key: string): Profile {
  if (key === "diet") return { ...profile, diet: "any" };
  if (key === "budget") return { ...profile, budgetPence: null };
  if (key === "people") return { ...profile, people: 1 };
  if (key.startsWith("avoid:"))
    return { ...profile, avoid: profile.avoid.filter((one) => `avoid:${one}` !== key) };
  return profile;
}

// A shopper may add a restriction from the page without the agent, so a new allergy takes effect at once.
export function withAllergen(profile: Profile, allergen: Profile["avoid"][number]): Profile {
  return profile.avoid.includes(allergen) ? profile : { ...profile, avoid: [...profile.avoid, allergen] };
}
