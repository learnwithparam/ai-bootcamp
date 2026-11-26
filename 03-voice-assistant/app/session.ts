import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isOnTeam } from "../db/queries";

// Every front desk page and action calls this first. Signed out goes to sign-in; an account that is not
// on the team gets a plain not-found, so a stranger never learns the page exists.
export async function requireTeam() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in?next=/desk");
  if (!(await isOnTeam(session.user.id))) notFound();
  return session.user;
}
