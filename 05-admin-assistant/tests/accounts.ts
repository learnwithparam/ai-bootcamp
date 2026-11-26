import { auth } from "@bootcamp/auth";
import { portOf } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import { db } from "../db/queries";

// Real accounts for the tests, made the way the sign-up page makes them, and removed afterwards.
export const PASSWORD = "a long test password";

export async function makeAccount(name: string): Promise<{ id: string; email: string }> {
  const email = `admin-test-${crypto.randomUUID()}@example.com`;
  // The shared sign-in works out its own address from the host, as it does for a page request.
  const headers = new Headers({ host: `localhost:${portOf("admin-assistant")}` });
  const made = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD }, headers });
  return { id: made.user.id, email };
}

export async function removeAccounts(ids: string[]) {
  for (const id of ids) {
    await db.execute(sql`delete from admin_assistant.team where user_id = ${id}`);
    await db.execute(sql`delete from admin_assistant.changes where user_id = ${id}`);
    await db.execute(sql`delete from admin_assistant.discount_drafts where asked_by = ${id}`);
    await db.execute(sql`delete from admin_assistant.newsletters where written_by = ${id}`);
    await db.execute(sql`delete from "user" where id = ${id}`);
  }
}
