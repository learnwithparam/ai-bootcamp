import { ALLERGEN_WORDS, type Allergen, type Product, pounds } from "../rules/catalog";

// The shop's shelves as the model reads them: one line per product, with what the label says.
// The model reads this to choose; rules/layout.ts checks every choice against the same records.

const words = (tags: string[]) =>
  tags.map((tag) => ALLERGEN_WORDS[tag as Allergen] ?? tag).join(", ") || "none";

export function catalogueText(products: Product[]): string {
  const lines = products.map(
    (product) =>
      `${product.code} | ${product.name} | ${product.brand} ${product.quantity} | ${product.aisle} | ${pounds(product.pricePence)} | ` +
      `contains: ${words(product.allergens)} | may contain: ${words(product.traces)} | diet: ${product.diet}`,
  );
  return `## Catalogue\n\ncode | name | brand and size | aisle | price | contains | may contain | diet\n${lines.join("\n")}`;
}
