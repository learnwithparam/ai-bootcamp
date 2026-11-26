import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../auth/auth";

export async function maybeUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

// A page about one account's own apps and calls. Signed out, it sends the person to sign in and back.
export async function requireUser(back: string) {
  const user = await maybeUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  return user;
}
