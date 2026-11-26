import { recheck, shelfOf } from "./layout";
import type { Profile } from "./profile";
import type { Section } from "./sections";

// What the page draws from the shared state, worked out in the browser on every change.
// The same rules as the server, so a chip the shopper adds hides products at once, before the agent runs again.
// An aisle picked in the aisle bar narrows the rows to that aisle; the hero and the bar itself stay.

export function visibleSections(sections: Section[], profile: Profile, aisle: string | null): Section[] {
  const products = sections.flatMap((section) =>
    section.type === "hero" ? [section.product] : section.type === "filterBar" ? [] : section.products,
  );
  const checked = recheck(sections, shelfOf(products), profile);
  if (!aisle) return checked;
  return checked.flatMap((section): Section[] => {
    if (section.type === "hero" || section.type === "filterBar") return [section];
    const products = section.products.filter((product) => product.aisle === aisle);
    return products.length > 0 ? [{ ...section, products }] : [];
  });
}
