import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isOwner } from "../db/queries";

// Every page here calls this first. Signed out goes to sign-in; any account but the owner's gets a plain not-found,
// so nobody learns the admin assistant exists.
export async function requireOwner() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  if (!(await isOwner(session.user.id))) notFound();
  return session.user;
}
