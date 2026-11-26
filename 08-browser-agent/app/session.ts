import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { roleOf } from "../db/people";

// Every page, action and picture calls this first. No session means the sign-in page.
// A signed-in account that is not on the intake desk gets a not-found page, as if the inbox did not exist.
export async function requireOperator() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  const role = await roleOf(session.user.id);
  if (!role) notFound();
  return { ...session.user, role };
}
