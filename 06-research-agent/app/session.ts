import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { roleOf } from "../db/queries";
import type { Role } from "../rules/team";

export type Member = { id: string; name: string; role: Role };

// Every page and action calls this first. No session means the sign-in page.
// The role comes from the team table, never from the browser.
export async function requireMember(): Promise<Member> {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  return { id: session.user.id, name: session.user.name, role: await roleOf(session.user.id) };
}
