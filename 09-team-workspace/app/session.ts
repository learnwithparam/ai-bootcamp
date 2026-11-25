import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { roleOf } from "../db/queries";

// Every page here calls this first. Signed out goes to sign-in. An account that is not in the team
// gets a plain not-found, so a stranger learns nothing about the workspace.
export async function requireMember() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  const role = await roleOf(session.user.id);
  if (!role) notFound();
  return { ...session.user, role };
}

export async function requireAdmin() {
  const member = await requireMember();
  if (member.role !== "admin") notFound();
  return member;
}
