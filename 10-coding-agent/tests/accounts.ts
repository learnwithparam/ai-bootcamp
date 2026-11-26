import { auth } from "@bootcamp/auth";
import { portOf } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import { addMember } from "../db/people";
import { db } from "../db/queries";
import type { Role } from "../rules/review";

// Real accounts for the tests, made the way the sign-up page makes them, and removed afterwards with their runs.
export const PASSWORD = "a long test password";

export async function makeAccount(name: string, role: Role | null): Promise<{ id: string; email: string }> {
  const email = `coding-test-${crypto.randomUUID()}@example.com`;
  // The shared sign-in works out its own address from the host, as it does for a page request.
  const headers = new Headers({ host: `localhost:${portOf("coding-agent")}` });
  const made = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD }, headers });
  if (role) await addMember(made.user.id, role);
  return { id: made.user.id, email };
}

export async function removeAccounts(ids: string[]) {
  for (const id of ids) {
    await db.execute(sql`delete from coding_agent.runs where user_id = ${id}`);
    await db.execute(sql`delete from coding_agent.reviews where reviewer_id = ${id}`);
    await db.execute(sql`delete from coding_agent.members where user_id = ${id}`);
    await db.execute(sql`delete from "user" where id = ${id}`);
  }
}
