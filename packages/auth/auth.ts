import { pool } from "@bootcamp/db";
import { required } from "@bootcamp/model";
import { ALL_PORTS } from "@bootcamp/products";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

// Real accounts for every product: email and password, hashed, with sessions in Postgres.
// One account works in every product, because they share the same auth tables.
// `bun run setup` creates the tables with the better-auth migrate command.

// The account settings every product shares. A product that needs more, like the MCP server's OAuth,
// builds its own auth from these, so an account and its session still work everywhere.
export const accountOptions = {
  database: pool,
  secret: required("BETTER_AUTH_SECRET"),
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...accountOptions,
  // Each product runs on its own localhost port. Better Auth builds each request's address from this list,
  // and refuses a host that is not on it.
  baseURL: { allowedHosts: ALL_PORTS.map((port) => `localhost:${port}`), protocol: "http" },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

// Used by pages and API routes: returns the signed-in user, or null.
export async function currentSession(headers: Headers): Promise<Session | null> {
  return auth.api.getSession({ headers });
}
