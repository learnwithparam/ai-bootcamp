import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isOnTeam } from "../db/queries";

// Every Merchandising page and action calls this first. Signed out goes to sign-in; a shopper's account
// gets a plain not-found, so a shopper never learns the page exists.
export async function requireTeam() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in?next=/merchandising");
  if (!(await isOnTeam(session.user.id))) notFound();
  return session.user;
}
