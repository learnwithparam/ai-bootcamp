import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isOnSupportTeam, supportTeam } from "../rules/support";

// The chat works without signing in. Signing in adds the visitor's own plan and billing.
export async function maybeUser() {
  const session = await currentSession(await headers());
  return session?.user ?? null;
}

export function canSeeSupport(email: string | undefined): boolean {
  return isOnSupportTeam(email, supportTeam(process.env.SUPPORT_EMAILS));
}

// The support queue and its action call this first. Anyone else gets a plain not-found page.
export async function requireSupport() {
  const user = await maybeUser();
  if (!user) redirect("/sign-in");
  if (!canSeeSupport(user.email)) notFound();
  return user;
}
