import { randomUUID } from "node:crypto";
import { currentSession } from "@bootcamp/auth";

// Who is shopping. A signed-in shopper is their account. A guest is a random id in a cookie the page
// cannot read, so a guest's page and basket open only in the browser that made them.
export const COOKIE = "fernhill_shopper";
const YEAR = 60 * 60 * 24 * 365;
const GUEST = /^[0-9a-f-]{36}$/;

export type Shopper = { owner: string; name: string | null; setCookie: string | null };

export function guestFrom(cookieHeader: string | null): string | null {
  const found = cookieHeader
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === COOKIE)?.[1];
  return found && GUEST.test(found) ? found : null;
}

// For a page: the owner if one is known yet. A first-time guest has none until they ask for something.
export async function knownShopper(headers: Headers): Promise<{ owner: string | null; name: string | null }> {
  const session = await currentSession(headers);
  if (session) return { owner: `user:${session.user.id}`, name: session.user.name };
  const guest = guestFrom(headers.get("cookie"));
  return { owner: guest ? `guest:${guest}` : null, name: null };
}

// For a request that saves something: always an owner, with a new guest cookie when there was none.
export async function shopperOf(request: Request): Promise<Shopper> {
  const known = await knownShopper(request.headers);
  if (known.owner) return { ...known, owner: known.owner, setCookie: null };
  const guest = randomUUID();
  const setCookie = `${COOKIE}=${guest}; Path=/; Max-Age=${YEAR}; HttpOnly; SameSite=Lax`;
  return { owner: `guest:${guest}`, name: null, setCookie };
}

// For a server action: the same owner, with the guest cookie set through Next when there was none.
export async function actionShopper(): Promise<string> {
  const { cookies, headers } = await import("next/headers");
  const known = await knownShopper(await headers());
  if (known.owner) return known.owner;
  const guest = randomUUID();
  (await cookies()).set(COOKIE, guest, { path: "/", maxAge: YEAR, httpOnly: true, sameSite: "lax" });
  return `guest:${guest}`;
}
