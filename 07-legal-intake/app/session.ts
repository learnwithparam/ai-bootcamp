import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLawyer } from "../db/queries";

// Every queue page and lawyer action calls this first. No session means the sign-in page.
// A signed-in account that is not a lawyer gets a not-found page, as if the queue did not exist.
export async function requireLawyer() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  if (!(await isLawyer(session.user.id))) notFound();
  return session.user;
}
