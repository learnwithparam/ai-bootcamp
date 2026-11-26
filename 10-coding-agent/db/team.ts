import { auth } from "@bootcamp/auth";
import { portOf } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import type { Role } from "../rules/review";
import { addMember } from "./people";
import { db } from "./queries";
import { members, runs } from "./schema";

// The team, made through the real sign-up path: two developers who run the agent and one reviewer.

export const SEED_PASSWORD = "seeded review password";
export const SEED_DOMAIN = "coding-seed.learnwithparam.test";

export const TEAM: { key: string; name: string; role: Role }[] = [
  { key: "maya", name: "Maya Chen", role: "developer" },
  { key: "ravi", name: "Ravi Iyer", role: "developer" },
  { key: "theo", name: "Theo Grant", role: "reviewer" },
];

// Running it again removes the seeded people, their runs and their reviews, then signs them up again.
export async function freshTeam(): Promise<Map<string, string>> {
  const seeded = sql`(select id from "user" where email like ${`%@${SEED_DOMAIN}`})`;
  await db.execute(sql`delete from ${runs} where user_id in ${seeded}`);
  await db.execute(sql`delete from coding_agent.reviews where reviewer_id in ${seeded}`);
  await db.execute(sql`delete from ${members} where user_id in ${seeded}`);
  await db.execute(sql`delete from "user" where email like ${`%@${SEED_DOMAIN}`}`);
  const headers = new Headers({ host: `localhost:${portOf("coding-agent")}` });
  const ids = new Map<string, string>();
  for (const person of TEAM) {
    const body = { name: person.name, email: `${person.key}@${SEED_DOMAIN}`, password: SEED_PASSWORD };
    const { user } = await auth.api.signUpEmail({ body, headers });
    await addMember(user.id, person.role);
    ids.set(person.key, user.id);
  }
  return ids;
}
