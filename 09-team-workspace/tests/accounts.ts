import { auth } from "@bootcamp/auth";
import { pool } from "@bootcamp/db";
import { findProduct } from "@bootcamp/products";
import { addMember, type Role } from "../db/queries";

// Real accounts for the tests, made the way the sign-up page makes them, and removed afterwards.
export const PASSWORD = "a long test password";
export type Person = { id: string; name: string; email: string; cookie: string };

export async function makeAccount(name: string, role?: Role): Promise<Person> {
  const email = `workspace-test-${crypto.randomUUID()}@example.com`;
  // The shared sign-in works out its own address from the host, as it does for a page request.
  const host = new Headers({ host: `localhost:${findProduct("team-workspace").port}` });
  const made = await auth.api.signUpEmail({
    body: { name, email, password: PASSWORD },
    headers: host,
    returnHeaders: true,
  });
  const cookie = made.headers
    .getSetCookie()
    .map((each) => each.split(";")[0])
    .join("; ");
  if (role) await addMember(made.response.user.id, role);
  return { id: made.response.user.id, name, email, cookie };
}

// Chats, messages and connections go with the chats and connectors; memories and members by person.
export async function removeAccounts(ids: string[]) {
  for (const table of ["memories", "chats", "connections", "members"])
    await pool.query(`delete from team_workspace.${table} where user_id = any($1)`, [ids]);
  await pool.query("delete from mcp_server.saved where user_id = any($1)", [ids]);
  await pool.query('delete from "user" where id = any($1)', [ids]);
}
