import { findProduct, GALLERY_PORT } from "@bootcamp/products";
import { $ } from "bun";

// bun run dev                  starts the gallery on http://localhost:3100
// bun run dev invoice-inbox    starts one product on its own port

const slug = process.argv[2];
const folder = slug ? findProduct(slug).folder : "gallery";
const port = slug ? findProduct(slug).port : GALLERY_PORT;

console.log(`Starting ${folder} on http://localhost:${port}`);
// Next.js runs on Node. Bun installs the packages and runs this script, and the child inherits the repo's settings.
await $`bunx next dev ${folder} --port ${port}`;
