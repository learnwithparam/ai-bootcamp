import { z } from "zod";
import { AISLES, type Product } from "./catalog";

// The registry: the only kinds of section the page can draw. The agent asks for sections from this list,
// naming products by their code. It never writes a product, a price or an allergen itself.

export const SECTION_TYPES = ["hero", "productRow", "bundle", "filterBar", "recipeCard"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];
// The names the team sees for each kind of section.
export const SECTION_LABEL: Record<SectionType, string> = {
  hero: "Banner",
  productRow: "Product row",
  bundle: "Bundle",
  filterBar: "Aisle bar",
  recipeCard: "Recipe card",
};

const text = (max: number) => z.string().min(1).max(max);
const codes = z.array(z.string()).max(12);

// What the agent writes for one section. Titles are in the shopper's language.
export const SectionRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hero"), headline: text(80), subline: text(160), code: z.string() }),
  z.object({ type: z.literal("productRow"), title: text(60), reason: text(140), codes }),
  z.object({ type: z.literal("bundle"), title: text(60), reason: text(140), codes }),
  z.object({ type: z.literal("filterBar"), aisles: z.array(z.enum(AISLES)).min(2).max(8) }),
  z.object({
    type: z.literal("recipeCard"),
    title: text(60),
    steps: z.array(text(160)).min(2).max(5),
    codes,
  }),
]);
export type SectionRequest = z.infer<typeof SectionRequestSchema>;

// What the page draws: the request with its products filled in from the shop's own records.
export type Section =
  | { id: string; type: "hero"; headline: string; subline: string; product: Product }
  | { id: string; type: "productRow" | "bundle"; title: string; reason: string; products: Product[] }
  | { id: string; type: "filterBar"; aisles: string[] }
  | { id: string; type: "recipeCard"; title: string; steps: string[]; products: Product[] };

// A product the rules took out, and why. The merchandiser sees each one.
export type Removed = { code: string; name: string; why: string };

// The fewest products each kind of section needs to be worth drawing.
export const FEWEST: Record<"productRow" | "bundle" | "recipeCard", number> = {
  productRow: 3,
  bundle: 2,
  recipeCard: 2,
};
