import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isOnSupportTeam } from "../db/queries";

// The chat works without signing in. Signing in adds the visitor's own plan and billing.
export async function maybeUser() {
  const session = await currentSession(await headers());
  return session?.user ?? null;
}

// Support is a row added by `db/support.ts` for one account, never an email: anyone can sign up with any email.
export async function canSeeSupport(userId: string | undefined): Promise<boolean> {
  return userId ? isOnSupportTeam(userId) : false;
}

// The support queue and its action call this first. Anyone else gets a plain not-found page.
export async function requireSupport() {
  const user = await maybeUser();
  if (!user) redirect("/sign-in");
  if (!(await canSeeSupport(user.id))) notFound();
  return user;
}
