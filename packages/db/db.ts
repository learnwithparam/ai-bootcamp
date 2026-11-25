import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// One Postgres for every product. Each product keeps its tables in its own schema
// (for example invoice_inbox.invoices), so two products never share a table.

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env, then run `bun run setup`.");
}

export const pool = new Pool({ connectionString: url, max: 10 });

export function connect<Schema extends Record<string, unknown>>(schema: Schema) {
  return drizzle(pool, { schema });
}
