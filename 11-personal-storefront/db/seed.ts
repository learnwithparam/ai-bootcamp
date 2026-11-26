import { auth } from "@bootcamp/auth";
import { portOf } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import { ProductSchema } from "../rules/catalog";
import { NEW_PROFILE } from "../rules/profile";
import { addToTeam, db, savePage } from "./queries";
import { products } from "./schema";

// bun run seed personal-storefront
// The shelves from db/products.json, a merchandiser, and a signed-in shopper with a saved profile.
// The shopper's page itself is laid out by the real agent the first time they ask, never written here.
// Running it again replaces all of it, and clears every basket and personalization.

export const SEED_PASSWORD = "seeded shop password";
const DOMAIN = "seed.learnwithparam.test";
export const PEOPLE = {
  merchandiser: { name: "Ines Costa", email: `merchandiser@${DOMAIN}` },
  shopper: { name: "Kofi Adeyemi", email: `shopper@${DOMAIN}` },
};

const file = await Bun.file(new URL("./products.json", import.meta.url)).json();
const shelves = ProductSchema.array().parse(file);

async function signUp(person: { name: string; email: string }): Promise<string> {
  await db.execute(sql`delete from "user" where email = ${person.email}`);
  const headers = new Headers({ host: `localhost:${portOf("personal-storefront")}` });
  const made = await auth.api.signUpEmail({ body: { ...person, password: SEED_PASSWORD }, headers });
  return made.user.id;
}

await db.execute(sql`truncate personal_storefront.basket_items, personal_storefront.personalizations,
  personal_storefront.profiles, personal_storefront.section_types, personal_storefront.team, personal_storefront.products`);
await db.insert(products).values(shelves);
await addToTeam(await signUp(PEOPLE.merchandiser));
const shopperId = await signUp(PEOPLE.shopper);
// Kofi told the shop once that he avoids peanuts and shops for two. His page is laid out when he next asks.
await savePage({
  owner: `user:${shopperId}`,
  profile: { ...NEW_PROFILE, avoid: ["peanuts"], people: 2 },
  sections: [],
});
console.log(`Products: ${shelves.length}.`);
for (const [role, person] of Object.entries(PEOPLE))
  console.log(`Sign in as ${role}: ${person.email} / ${SEED_PASSWORD}`);
process.exit(0);
