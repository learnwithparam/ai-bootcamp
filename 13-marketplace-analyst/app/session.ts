import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Every page calls this first. No session means the sign-in page.
export async function requireUser(): Promise<{ id: string; name: string }> {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  return { id: session.user.id, name: session.user.name };
}
