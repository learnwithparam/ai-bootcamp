import { parseCatalog } from "@bootcamp/catalog";
import { replaceCatalog } from "./queries";

// bun run seed mcp-server-and-cli
// Reads the live catalog from learnwithparam.com/llms.txt into Postgres. Run it again to pick up new items.

const SOURCE = "https://www.learnwithparam.com/llms.txt";

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Could not read ${SOURCE} (${response.status}).`);
const catalog = parseCatalog(await response.text());
if (catalog.length < 20)
  throw new Error(`Only ${catalog.length} items in ${SOURCE}. The page format may have changed.`);
await replaceCatalog(catalog);
console.log(`Loaded ${catalog.length} catalog items from ${SOURCE}.`);
process.exit(0);
