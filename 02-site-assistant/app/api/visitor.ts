import { randomUUID } from "node:crypto";
import { currentSession } from "@bootcamp/auth";
import { required } from "@bootcamp/model";

// Who is writing. A signed-in visitor is their account. A guest is a random id in a cookie the page
// cannot read, so a conversation opens only in the browser that started it.
const COOKIE = "site_visitor";
const YEAR = 60 * 60 * 24 * 365;
const GUEST = /^[0-9a-f-]{36}$/;

export type Writer = {
  owner: string;
  limitId: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  setCookie: string | null;
};

function cookieValue(request: Request): string | null {
  const found = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === COOKIE)?.[1];
  return found && GUEST.test(found) ? found : null;
}

// Questions are counted by account, or for a guest by the address in the one header your proxy sets,
// named in SITE_ASSISTANT_IP_HEADER. A cookie can be cleared and any other header typed, so neither counts.
export async function writerOf(request: Request): Promise<Writer> {
  const session = await currentSession(request.headers);
  if (session) {
    const { id, name, email } = session.user;
    return { owner: `user:${id}`, limitId: `user:${id}`, userId: id, name, email, setCookie: null };
  }
  const known = cookieValue(request);
  const guest = known ?? randomUUID();
  const address = request.headers.get(required("SITE_ASSISTANT_IP_HEADER"))?.trim() || "unknown";
  return {
    owner: `guest:${guest}`,
    limitId: `ip:${address}`,
    userId: null,
    name: null,
    email: null,
    setCookie: known ? null : `${COOKIE}=${guest}; Path=/; Max-Age=${YEAR}; HttpOnly; SameSite=Lax`,
  };
}

export const cookieHeaders = (writer: Writer): Record<string, string> =>
  writer.setCookie ? { "set-cookie": writer.setCookie } : {};
