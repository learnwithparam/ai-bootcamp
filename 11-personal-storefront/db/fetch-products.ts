import { writeFile } from "node:fs/promises";
import {
  type Aisle,
  ALLERGENS,
  type Diet,
  labelledDiet,
  type Product,
  ProductSchema,
} from "../rules/catalog";

// Fetches the shop's shelves from Open Food Facts, once, into db/products.json. The seed reads that file,
// so every learner gets the same shop and no one hits the Open Food Facts servers on setup.
//   bun 11-personal-storefront/db/fetch-products.ts
// Data from Open Food Facts (openfoodfacts.org), under the Open Database License.

const AGENT = "ai-bootcamp-course/1.0";
const PER_AISLE = 20;

// Each aisle is an Open Food Facts category, and a price range from Fernhill's own price list, in pence.
const SHELVES: { aisle: Aisle; category: string; pence: [number, number] }[] = [
  { aisle: "breakfast", category: "en:breakfast-cereals", pence: [189, 449] },
  { aisle: "plant milk", category: "en:plant-based-milk-alternatives", pence: [129, 239] },
  { aisle: "dairy", category: "en:yogurts", pence: [99, 299] },
  { aisle: "pasta and rice", category: "en:pastas", pence: [85, 249] },
  { aisle: "sauces", category: "en:pasta-sauces", pence: [129, 329] },
  { aisle: "tins and beans", category: "en:canned-legumes", pence: [55, 145] },
  { aisle: "bread", category: "en:breads", pence: [95, 285] },
  { aisle: "snacks", category: "en:crisps", pence: [110, 275] },
  { aisle: "biscuits", category: "en:biscuits", pence: [79, 249] },
  { aisle: "nuts and spreads", category: "en:spreads", pence: [175, 425] },
  { aisle: "chocolate", category: "en:chocolates", pence: [89, 349] },
];

type Hit = {
  code: string;
  product_name?: string;
  brands?: string[];
  quantity?: string;
  image_front_url?: string;
};
type Detail = {
  allergens_tags?: string[];
  traces_tags?: string[];
  states_tags?: string[];
  ingredients_analysis_tags?: string[];
  nutriscore_grade?: string;
};

// Open Food Facts allows 100 product reads a minute. A 429 means wait as long as it asks, then try again.
async function getJson<T>(url: URL, tries = 3): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": AGENT } });
  if (response.status === 429 && tries > 1) {
    const seconds = Number(response.headers.get("retry-after")) || 60;
    console.log(`Open Food Facts asked us to wait ${seconds}s`);
    await Bun.sleep(seconds * 1000);
    return getJson(url, tries - 1);
  }
  if (!response.ok) throw new Error(`Open Food Facts answered ${response.status} for ${url}`);
  return (await response.json()) as T;
}

async function search(category: string): Promise<Hit[]> {
  const url = new URL("https://search.openfoodfacts.org/search");
  url.searchParams.set("q", `categories:"${category}" AND countries:"en:united-kingdom" AND lang:en`);
  url.searchParams.set("page_size", String(PER_AISLE * 3));
  url.searchParams.set("sort_by", "-unique_scans_n");
  url.searchParams.set("fields", "code,product_name,brands,quantity,image_front_url");
  return (await getJson<{ hits: Hit[] }>(url)).hits;
}

async function detail(code: string): Promise<Detail> {
  const fields = "allergens_tags,traces_tags,states_tags,ingredients_analysis_tags,nutriscore_grade";
  const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`);
  return (await getJson<{ product: Detail }>(url)).product;
}

const bare = (tags: string[] = []) => tags.filter((tag) => tag.startsWith("en:")).map((tag) => tag.slice(3));

function dietOf(tags: string[] = []): Diet {
  if (tags.includes("en:vegan")) return "vegan";
  if (tags.includes("en:vegetarian")) return "vegetarian";
  if (tags.includes("en:non-vegan") && tags.includes("en:non-vegetarian")) return "neither";
  return "unknown";
}

// The same product always gets the same price, somewhere in its aisle's range.
function priceFor(code: string, [low, high]: [number, number]): number {
  const spread = [...code].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 7) / 9973;
  return Math.round((low + spread * (high - low)) / 5) * 5 - 1;
}

const titleCase = (brand: string) => brand.replace(/^xx:/, "").replace(/\b\w/g, (char) => char.toUpperCase());
// Some labels are typed in capitals. Shown that way they shout, so a name with no small letters is title-cased.
const calm = (text: string) =>
  /\p{Ll}/u.test(text)
    ? text
    : text.toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (_, gap, char) => gap + char.toUpperCase());

type Fetched = Omit<Product, "allergens" | "traces"> & { allergens: string[]; traces: string[] };
const known = (tags: string[]) => tags.filter((tag) => tag !== "none");
const readable = (tags: string[]) =>
  known(tags).every((tag) => (ALLERGENS as readonly string[]).includes(tag));

// A product found on two shelves is kept on the first, since the shop has one record per barcode.
// A product whose allergen list is free text ("Lait", a sentence) is left out: the rules could not read it.
export function tidy(fetched: Fetched[]): Product[] {
  const seen = new Set<string>();
  return fetched.flatMap((raw) => {
    if (seen.has(raw.code) || !readable(raw.allergens) || !readable(raw.traces)) return [];
    const product = ProductSchema.parse({
      ...raw,
      allergens: known(raw.allergens),
      traces: known(raw.traces),
    });
    seen.add(product.code);
    return [
      { ...product, diet: labelledDiet(product), name: calm(product.name), brand: calm(product.brand) },
    ];
  });
}

// A product joins the shop only with a name, a picture and a finished ingredients list,
// because an allergen list we cannot trust must never read as "no allergens".
async function shelf(entry: (typeof SHELVES)[number]): Promise<Fetched[]> {
  const products: Fetched[] = [];
  const names = new Set<string>();
  for (const hit of await search(entry.category)) {
    if (products.length >= PER_AISLE) break;
    const name = hit.product_name?.trim();
    if (!name || !hit.image_front_url || names.has(name.toLowerCase())) continue;
    const facts = await detail(hit.code);
    await Bun.sleep(700);
    if (!facts.states_tags?.includes("en:ingredients-completed")) continue;
    names.add(name.toLowerCase());
    const product = {
      code: hit.code,
      name,
      brand: titleCase(hit.brands?.[0] ?? "Own brand"),
      quantity: hit.quantity ?? "",
      aisle: entry.aisle,
      image: hit.image_front_url,
      allergens: bare(facts.allergens_tags),
      traces: bare(facts.traces_tags),
      diet: dietOf(facts.ingredients_analysis_tags),
      nutriscore: facts.nutriscore_grade ?? "unknown",
      pricePence: priceFor(hit.code, entry.pence),
    };
    products.push(product);
  }
  console.log(`${entry.aisle}: ${products.length}`);
  return products;
}

if (import.meta.main) {
  const all: Fetched[] = [];
  for (const entry of SHELVES) all.push(...(await shelf(entry)));
  const products = tidy(all);
  await writeFile(new URL("./products.json", import.meta.url), `${JSON.stringify(products, null, 1)}\n`);
  console.log(`Saved ${products.length} products to db/products.json`);
}
