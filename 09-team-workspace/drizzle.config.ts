import { defineConfig } from "drizzle-kit";

// `bunx drizzle-kit generate` writes a migration from db/schema.ts. `bun run setup` applies it.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Run `bun run setup` from the repo root.");

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  schemaFilter: ["team_workspace"],
  // Each product records its own applied migrations, so one product's history never hides another's.
  migrations: { schema: "drizzle", table: "team_workspace_migrations" },
  dbCredentials: { url },
});
