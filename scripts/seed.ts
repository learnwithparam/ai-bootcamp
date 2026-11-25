import { findProduct, PRODUCTS } from "@bootcamp/products";
import { $ } from "bun";

// bun run seed                 loads the sample data of every product
// bun run seed invoice-inbox   loads one product's sample data again

const slug = process.argv[2];
const products = slug ? [findProduct(slug)] : PRODUCTS;

for (const product of products) {
  console.log(`== Seeding ${product.title}`);
  await $`bun run --cwd ${product.folder} seed`;
}
