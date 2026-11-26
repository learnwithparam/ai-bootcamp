import { type Product, ProductSchema } from "../rules/catalog";
import { shelfOf } from "../rules/layout";
import { NEW_PROFILE, type Profile } from "../rules/profile";

// A small shop for the rules tests. Each product is written the way the Open Food Facts fetch
// stores one, and checked by the same schema.

export const product = (code: string, fields: Partial<Product>): Product =>
  ProductSchema.parse({
    code,
    name: `Product ${code}`,
    brand: "Fernhill",
    quantity: "400 g",
    aisle: "snacks",
    image: `https://images.openfoodfacts.org/images/products/${code}/front.jpg`,
    allergens: [],
    traces: [],
    diet: "vegan",
    nutriscore: "b",
    pricePence: 200,
    ...fields,
  });

export const OATS = product("1", { name: "Rolled oats", aisle: "breakfast", allergens: ["gluten"] });
export const PEANUT_BUTTER = product("2", {
  name: "Peanut butter",
  aisle: "nuts and spreads",
  allergens: ["peanuts"],
});
export const MUESLI = product("3", { name: "Muesli", aisle: "breakfast", traces: ["peanuts"] });
export const YOGHURT = product("4", {
  name: "Greek yoghurt",
  aisle: "dairy",
  allergens: ["milk"],
  diet: "vegetarian",
});
export const LENTILS = product("5", { name: "Red lentils", aisle: "tins and beans", pricePence: 150 });
export const CRISPS = product("6", { name: "Sea salt crisps", diet: "unknown" });
export const RICE = product("7", { name: "Basmati rice", aisle: "pasta and rice", pricePence: 900 });
export const ALL = [OATS, PEANUT_BUTTER, MUESLI, YOGHURT, LENTILS, CRISPS, RICE];
export const SHELF = shelfOf(ALL);
export const PEANUTS: Profile = { ...NEW_PROFILE, avoid: ["peanuts"] };
export const VEGAN: Profile = { ...NEW_PROFILE, diet: "vegan" };
