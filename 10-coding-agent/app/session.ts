import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { roleOf } from "../db/people";

// Every page and action calls this first. No session means the sign-in page.
// A signed-in account that is not on the team gets a not-found page, as if the runs did not exist.
export async function requireMember() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  const role = await roleOf(session.user.id);
  if (!role) notFound();
  return { id: session.user.id, name: session.user.name, role };
}
