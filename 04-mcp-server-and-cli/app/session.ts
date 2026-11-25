import { headers } from "next/headers";
import { auth } from "../auth/auth";

export async function maybeUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

// Only a path on this site, so a crafted link cannot send someone elsewhere after they sign in.
export function samePath(next: string | undefined): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}
