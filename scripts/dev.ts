import { findProduct, GALLERY_PORT, portOf } from "@bootcamp/products";
import { $ } from "bun";

// bun run dev                  starts the gallery on http://localhost:3100
// bun run dev invoice-inbox    starts one product on its own port

const slug = process.argv[2];
const folder = slug ? findProduct(slug).folder : "gallery";
const port = slug ? portOf(slug) : GALLERY_PORT;

console.log(`Starting ${folder} on http://localhost:${port}`);
// Next.js runs on Node, from the version pinned in the product's package.json (bunx would fetch the latest).
// Bun installs the packages and runs this script, and the child inherits the repo's settings.
await $`./node_modules/.bin/next dev --port ${port}`.cwd(folder);
