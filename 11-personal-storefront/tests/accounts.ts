import { auth } from "@bootcamp/auth";
import { portOf } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import { db } from "../db/queries";

// Real accounts for the tests, made the way the sign-up page makes them, and removed afterwards
// with every row they or a test guest left behind.
export const PASSWORD = "a long test password";

export async function makeAccount(name: string): Promise<{ id: string; email: string }> {
  const email = `storefront-test-${crypto.randomUUID()}@example.com`;
  // The shared sign-in works out its own address from the host, as it does for a page request.
  const headers = new Headers({ host: `localhost:${portOf("personal-storefront")}` });
  const made = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD }, headers });
  return { id: made.user.id, email };
}

export async function removeOwners(owners: string[]) {
  for (const owner of owners) {
    await db.execute(sql`delete from personal_storefront.basket_items where owner = ${owner}`);
    await db.execute(sql`delete from personal_storefront.personalizations where owner = ${owner}`);
    await db.execute(sql`delete from personal_storefront.profiles where owner = ${owner}`);
  }
}

export async function removeAccounts(ids: string[]) {
  await removeOwners(ids.map((id) => `user:${id}`));
  for (const id of ids) {
    await db.execute(sql`delete from personal_storefront.team where user_id = ${id}`);
    await db.execute(sql`delete from "user" where id = ${id}`);
  }
}
