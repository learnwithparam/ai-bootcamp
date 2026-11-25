import { currentSession } from "@bootcamp/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isOperator } from "../db/queries";

// Every page, action and picture calls this first. No session means the sign-in page.
// A signed-in account that is not an operator gets a not-found page, as if the inbox did not exist.
export async function requireOperator() {
  const session = await currentSession(await headers());
  if (!session) redirect("/sign-in");
  if (!(await isOperator(session.user.id))) notFound();
  return session.user;
}
