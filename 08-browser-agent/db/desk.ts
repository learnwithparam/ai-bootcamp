import { auth } from "@bootcamp/auth";
import { portOf } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import type { Role } from "../rules/team";
import { INBOX } from "./inbox";
import { addOperator } from "./people";
import { addEmail, db } from "./queries";
import { emails, operators } from "./schema";

// The firm's intake desk, made through the real sign-up path: an intake lead and an intake assistant,
// and the twelve emails of the shared inbox, received over the last two days. No model.

export const SEED_PASSWORD = "seeded intake password";
export const SEED_DOMAIN = "intake-seed.learnwithparam.test";
const HOUR = 3_600_000;

const PEOPLE: { key: string; name: string; role: Role }[] = [
  { key: "nadia", name: "Nadia Rahman", role: "lead" },
  { key: "owen", name: "Owen Price", role: "assistant" },
];

async function freshPeople(): Promise<Map<string, string>> {
  const seeded = sql`(select id from "user" where email like ${`%@${SEED_DOMAIN}`})`;
  await db.execute(sql`delete from ${operators} where user_id in ${seeded}`);
  await db.execute(sql`delete from "user" where email like ${`%@${SEED_DOMAIN}`}`);
  const headers = new Headers({ host: `localhost:${portOf("browser-agent")}` });
  const ids = new Map<string, string>();
  for (const person of PEOPLE) {
    const body = { name: person.name, email: `${person.key}@${SEED_DOMAIN}`, password: SEED_PASSWORD };
    const { user } = await auth.api.signUpEmail({ body, headers });
    await addOperator(user.id, person.role);
    ids.set(person.key, user.id);
  }
  return ids;
}

// Running it again replaces the desk, the inbox and every run made on it.
export async function freshDesk() {
  const people = await freshPeople();
  await db.delete(emails);
  const now = Date.now();
  const ids = new Map<string, string>();
  for (const email of INBOX) {
    const id = await addEmail(email, new Date(now - email.hoursAgo * HOUR));
    ids.set(`${email.fromName}: ${email.subject}`, id);
  }
  return { people, emails: ids };
}
