import { aisleName, type Product } from "./catalog";
import { allowed, type Profile, whyNot } from "./profile";
import {
  FEWEST,
  type Removed,
  type Section,
  type SectionRequest,
  SectionRequestSchema,
  type SectionType,
} from "./sections";

// The last word on every section the agent asks for. The agent may ask for anything; this decides what is drawn.
// A product with an allergen the shopper avoids, or that breaks their diet, is taken out here, whatever the agent said.

export type Shelf = Map<string, Product>;
export type Checked = { section: Section | null; removed: Removed[]; dropped?: string };

export const shelfOf = (products: Product[]): Shelf =>
  new Map(products.map((product) => [product.code, product]));

// Looks up each code, and keeps only the products this shopper may see.
function fill(codes: string[], shelf: Shelf, profile: Profile, removed: Removed[]): Product[] {
  const kept: Product[] = [];
  for (const code of new Set(codes)) {
    const product = shelf.get(code);
    if (!product) {
      removed.push({ code, name: "(not in the shop)", why: "not a product we sell" });
      continue;
    }
    const why = whyNot(product, profile);
    if (why) removed.push({ code, name: product.name, why });
    else kept.push(product);
  }
  return kept;
}

function build(
  request: SectionRequest,
  id: string,
  shelf: Shelf,
  profile: Profile,
  removed: Removed[],
): Section | string {
  if (request.type === "filterBar") return { id, type: "filterBar", aisles: request.aisles };
  if (request.type === "hero") {
    const [product] = fill([request.code], shelf, profile, removed);
    if (!product) return "its product cannot be shown";
    return { id, type: "hero", headline: request.headline, subline: request.subline, product };
  }
  const products = fill(request.codes, shelf, profile, removed);
  if (products.length < FEWEST[request.type]) return `only ${products.length} products left after the rules`;
  if (request.type === "recipeCard")
    return { id, type: "recipeCard", title: request.title, steps: request.steps, products };
  return { id, type: request.type, title: request.title, reason: request.reason, products };
}

// The name a shopper and a screen reader know a section by. Two sections on one page never share it.
export const headingOf = (section: Section) =>
  section.type === "hero" ? section.headline : section.type === "filterBar" ? "Aisles" : section.title;

// One section from the agent, checked. `enabled` is the merchandiser's list of section kinds the shop allows,
// and `above` the sections already on the page.
export function checkSection(
  raw: unknown,
  id: string,
  shelf: Shelf,
  profile: Profile,
  enabled: SectionType[],
  above: Section[] = [],
): Checked {
  const parsed = SectionRequestSchema.safeParse(raw);
  if (!parsed.success) return { section: null, removed: [], dropped: "not a section the page can draw" };
  if (!enabled.includes(parsed.data.type))
    return { section: null, removed: [], dropped: `${parsed.data.type} is turned off by the merchandiser` };
  const removed: Removed[] = [];
  const built = build(parsed.data, id, shelf, profile, removed);
  if (typeof built === "string") return { section: null, removed, dropped: built };
  const heading = headingOf(built).toLowerCase();
  if (above.some((one) => headingOf(one).toLowerCase() === heading))
    return { section: null, removed, dropped: `the same title as a section above it` };
  return { section: built, removed };
}

// Sections saved earlier are checked again before they are drawn, since a profile or a product can change.
export function recheck(sections: Section[], shelf: Shelf, profile: Profile): Section[] {
  return sections.flatMap((section): Section[] => {
    if (section.type === "filterBar") return [section];
    if (section.type === "hero") return section.product && allowed(section.product, profile) ? [section] : [];
    const products = section.products.filter(
      (product) => shelf.has(product.code) && allowed(product, profile),
    );
    return products.length >= FEWEST[section.type] ? [{ ...section, products }] : [];
  });
}

// The page before anyone says anything: a hero and one row per aisle, the most scanned products first.
export function defaultLayout(products: Product[], profile: Profile): Section[] {
  const sections: Section[] = [];
  const byAisle = new Map<string, Product[]>();
  for (const product of products.filter((one) => allowed(one, profile)))
    byAisle.set(product.aisle, [...(byAisle.get(product.aisle) ?? []), product]);
  const hero = byAisle.get("breakfast")?.[0];
  if (hero)
    sections.push({
      id: "hero",
      type: "hero",
      headline: "Good food, fair prices",
      subline: "Tell us how you shop and this page rearranges itself for you.",
      product: hero,
    });
  sections.push({ id: "aisles", type: "filterBar", aisles: [...byAisle.keys()] });
  for (const [aisle, shelf] of byAisle)
    sections.push({
      id: `aisle-${aisle}`,
      type: "productRow",
      title: aisleName(aisle),
      reason: "Popular this week",
      products: shelf.slice(0, 6),
    });
  return sections;
}
