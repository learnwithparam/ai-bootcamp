import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { staffRole } from "../db/queries";
import type { Role } from "../rules/board";

export type Staff = { id: string; name: string; role: Role };

// Every firm page and action calls this first. No session means the sign-in page.
// A signed-in account that is not on the staff gets a not-found page, as if the board did not exist.
export async function requireStaff(): Promise<Staff> {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  const role = await staffRole(session.user.id);
  if (!role) notFound();
  return { id: session.user.id, name: session.user.name, role };
}
