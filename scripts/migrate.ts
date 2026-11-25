import { existsSync } from "node:fs";
import { join } from "node:path";
import { findProduct, PRODUCTS } from "@bootcamp/products";
import { $ } from "bun";

// bun scripts/migrate.ts                           creates the sign-in tables, then every product's tables
// bun scripts/migrate.ts generate invoice-inbox add-notes   writes a migration named add-notes after you change db/schema.ts
// Run it from the repo root: Bun loads your settings there, and drizzle-kit inherits them.

const [command, slug, name] = process.argv.slice(2);

if (command === "generate") {
  if (!slug || !name) throw new Error("Usage: bun scripts/migrate.ts generate <product> <migration-name>");
  await $`bunx drizzle-kit generate --name ${name}`.cwd(findProduct(slug).folder);
  process.exit(0);
}

console.log("== Sign-in tables");
await $`bunx auth@1.7.23 migrate --config packages/auth/auth.ts -y`;
// The MCP server adds OAuth tables (clients, tokens, consents, signing keys) to the same accounts.
await $`bunx auth@1.7.23 migrate --config 04-mcp-server-and-cli/auth/auth.ts -y`;

for (const product of PRODUCTS) {
  if (!existsSync(join(product.folder, "drizzle.config.ts"))) continue;
  console.log(`== ${product.title} tables`);
  await $`bunx drizzle-kit migrate`.cwd(product.folder);
}
