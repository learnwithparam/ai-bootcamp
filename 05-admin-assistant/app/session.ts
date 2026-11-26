import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { roleOf } from "../db/queries";

// Every page here calls this first. Signed out goes to sign-in; an account not on the team gets a plain not-found,
// so nobody learns the admin exists.
export async function requireTeam() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  const role = await roleOf(session.user.id);
  if (!role) notFound();
  return { ...session.user, role };
}

// Approving a code or a newsletter. Each server action calls this itself, so a staff member who posts
// the form by hand is refused on the server, not only by a hidden button.
export async function requireOwner() {
  const member = await requireTeam();
  if (member.role !== "owner") throw new Error("Only an owner can approve this.");
  return member;
}
