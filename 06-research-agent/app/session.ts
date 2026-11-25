import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Every page and action calls this first. No session means the sign-in page.
export async function requireUser() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  return session.user;
}
