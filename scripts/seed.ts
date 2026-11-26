import { findProduct, PRODUCTS } from "@bootcamp/products";
import { $ } from "bun";

// bun run seed                 loads the sample data of every product
// bun run seed invoice-inbox   loads one product's sample data again

const slug = process.argv[2];
// A terminal product keeps no sample data, so there is nothing to seed.
const products = (slug ? [findProduct(slug)] : PRODUCTS).filter((product) => !product.command);

for (const product of products) {
  console.log(`== Seeding ${product.title}`);
  await $`bun run --cwd ${product.folder} seed`;
}
