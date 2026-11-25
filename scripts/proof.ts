import { findProduct, PRODUCTS } from "@bootcamp/products";
import { $ } from "bun";

// bun run proof                 runs every product's tests against the real model
// bun run proof invoice-inbox   runs one product's tests
// Each product's agent.test.ts asserts the metric named on its learner page, under "Prove it".

const slug = process.argv[2];
const products = slug ? [findProduct(slug)] : PRODUCTS;

for (const product of products) {
  console.log(`== Proving ${product.title}`);
  await $`bun test ${product.folder}/tests`;
}
