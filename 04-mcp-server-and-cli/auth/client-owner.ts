import { randomBytes, randomUUID } from "node:crypto";
import { auth } from "./auth";

// An OAuth client belongs to an account. Each client we register belongs to an account made for it alone,
// whose random password is thrown away at once, so nobody can sign in as it.
// ".invalid" is a reserved name that can never receive email.
export async function clientOwnerSession(name: string): Promise<Headers> {
  const { headers } = await auth.api.signUpEmail({
    body: {
      name,
      email: `client-${randomUUID()}@mcp-server.invalid`,
      password: randomBytes(32).toString("hex"),
    },
    returnHeaders: true,
  });
  const cookie = headers.getSetCookie().map((each) => each.split(";")[0]);
  return new Headers({ cookie: cookie.join("; ") });
}
