import { eq, sql } from "drizzle-orm";
import type { Role } from "../rules/team";
import { db } from "./queries";
import { operators } from "./schema";

// The people on the intake desk, and the accounts they sign in with.

export type Account = { id: string; name: string; email: string; createdAt: Date };

// Someone on the intake desk has a role. Anyone else, signed in or not, has none.
export async function roleOf(userId: string): Promise<Role | null> {
  const [row] = await db.select({ role: operators.role }).from(operators).where(eq(operators.userId, userId));
  return row?.role ?? null;
}

export async function addOperator(userId: string, role: Role) {
  await db
    .insert(operators)
    .values({ userId, role })
    .onConflictDoUpdate({ target: operators.userId, set: { role } });
}

// Only the operator script calls this, never a page.
export async function accountByEmail(email: string): Promise<Account | null> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" where email = ${email.toLowerCase()}`,
  );
  return found.rows[0] ?? null;
}
