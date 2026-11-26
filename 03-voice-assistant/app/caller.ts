import { randomUUID } from "node:crypto";

// Who is calling. There is no account: the caller is a random id in a cookie the page cannot read,
// so the per-caller limit in rules/limits.ts counts one browser.
export const COOKIE = "harbour_caller";
const YEAR = 60 * 60 * 24 * 365;
const ID = /^[0-9a-f-]{36}$/;

export function callerOf(request: Request): { caller: string; setCookie: string | null } {
  const found = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === COOKIE)?.[1];
  if (found && ID.test(found)) return { caller: found, setCookie: null };
  const caller = randomUUID();
  return { caller, setCookie: `${COOKIE}=${caller}; Path=/; Max-Age=${YEAR}; HttpOnly; SameSite=Lax` };
}
