import { auth } from "@bootcamp/auth";
import { findProduct } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import { db } from "../db/queries";

// Real accounts for the tests, made the way the sign-up page makes them, and removed afterwards.
export const PASSWORD = "a long test password";

export async function makeAccount(name: string): Promise<{ id: string; email: string }> {
  const email = `intake-test-${crypto.randomUUID()}@example.com`;
  // The shared sign-in works out its own address from the host, as it does for a page request.
  const headers = new Headers({ host: `localhost:${findProduct("legal-intake").port}` });
  const made = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD }, headers });
  return { id: made.user.id, email };
}

export async function removeAccounts(ids: string[]) {
  for (const id of ids) {
    await db.execute(sql`delete from legal_intake.lawyers where user_id = ${id}`);
    await db.execute(sql`delete from "user" where id = ${id}`);
  }
}
