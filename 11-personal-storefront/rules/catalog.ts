import { z } from "zod";

// What the shop sells, as the shop knows it. Names, allergens and pictures come from Open Food Facts;
// the prices are Fernhill's own, because Open Food Facts has none. The model never writes any of this.

export const AISLES = [
  "breakfast",
  "plant milk",
  "dairy",
  "pasta and rice",
  "sauces",
  "tins and beans",
  "bread",
  "snacks",
  "biscuits",
  "nuts and spreads",
  "chocolate",
] as const;
export type Aisle = (typeof AISLES)[number];

// The 14 allergens UK law asks a shop to declare, under the names Open Food Facts uses.
export const ALLERGENS = [
  "gluten",
  "milk",
  "eggs",
  "nuts",
  "peanuts",
  "soybeans",
  "sesame-seeds",
  "fish",
  "crustaceans",
  "molluscs",
  "celery",
  "mustard",
  "lupin",
  "sulphur-dioxide-and-sulphites",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_WORDS: Record<Allergen, string> = {
  gluten: "gluten",
  milk: "milk",
  eggs: "eggs",
  nuts: "tree nuts",
  peanuts: "peanuts",
  soybeans: "soya",
  "sesame-seeds": "sesame",
  fish: "fish",
  crustaceans: "shellfish",
  molluscs: "molluscs",
  celery: "celery",
  mustard: "mustard",
  lupin: "lupin",
  "sulphur-dioxide-and-sulphites": "sulphites",
};

export const Diet = z.enum(["vegan", "vegetarian", "neither", "unknown"]);
export type Diet = z.infer<typeof Diet>;

export const ProductSchema = z.object({
  code: z.string(),
  name: z.string(),
  brand: z.string(),
  quantity: z.string(),
  aisle: z.enum(AISLES),
  image: z.string().url(),
  // What the label says is in it, and what it may contain. Both keep a product off a shopper's page.
  // Only the 14 names above: a list the rules cannot read would read as "safe", so it is refused here.
  allergens: z.array(z.enum(ALLERGENS)),
  traces: z.array(z.enum(ALLERGENS)),
  diet: Diet,
  nutriscore: z.string(),
  pricePence: z.number().int().positive(),
});
export type Product = z.infer<typeof ProductSchema>;

// "pasta and rice" as a shopper reads it: "Pasta and rice".
export const aisleName = (aisle: string) => aisle.charAt(0).toUpperCase() + aisle.slice(1);

// Open Food Facts can label a chicken pizza vegan. A diet label that its own allergens contradict
// is not trusted, so the product counts as unknown and is never shown as vegan or vegetarian.
const NOT_VEGAN: Allergen[] = ["milk", "eggs", "fish", "crustaceans", "molluscs"];
const NOT_VEGETARIAN: Allergen[] = ["fish", "crustaceans", "molluscs"];

export function labelledDiet(product: Pick<Product, "diet" | "allergens">): Diet {
  const has = (list: Allergen[]) => list.some((one) => product.allergens.includes(one));
  if (product.diet === "vegan" && has(NOT_VEGAN)) return "unknown";
  if (product.diet === "vegetarian" && has(NOT_VEGETARIAN)) return "unknown";
  return product.diet;
}

export const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;
