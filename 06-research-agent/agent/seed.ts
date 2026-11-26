import { auth } from "@bootcamp/auth";
import { pool } from "@bootcamp/db";
import { portOf } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import { assignReport, db, setRole, startReport, updateReport } from "../db/queries";
import { members, reports } from "../db/schema";
import type { Role } from "../rules/team";
import { runResearch } from "./agent";

// bun run seed research-agent
// A sales team made through the real sign-up path: a lead and two reps. Then 11 real companies,
// each researched live by the real graph, the same way the Research button does it.
// The hard cases: a name shared by several companies, a German company, a small team that scores low,
// a company that does not exist, a misspelt name, and a bare website. It costs about $1.50 and takes a few minutes.
// Running it again replaces the team and its accounts.

export const SEED_PASSWORD = "seeded research password";
const SEED_DOMAIN = "research-seed.learnwithparam.test";
const DAY = 86_400_000;

const PEOPLE: { key: string; name: string; role: Role }[] = [
  { key: "priya", name: "Priya Raman", role: "lead" },
  { key: "tomas", name: "Tomás Ortega", role: "rep" },
  { key: "grace", name: "Grace Okafor", role: "rep" },
];

// Who adds each company, and who it ends up with. The lead's adds wait in Unassigned until given out.
const ACCOUNTS = [
  { company: "Vercel", by: "priya", owner: "tomas" },
  { company: "Linear", by: "priya", owner: "tomas" },
  { company: "Supabase", by: "priya", owner: "grace" },
  { company: "Mistral AI", by: "priya", owner: null },
  { company: "Mercury", by: "priya", owner: null },
  { company: "Celonis", by: "priya", owner: "grace" },
  { company: "Basecamp", by: "priya", owner: null },
  { company: "Qzxvbnmplk Widgets", by: "priya", owner: null },
  { company: "Notoin", by: "tomas", owner: "tomas" },
  { company: "Plausible Analytics", by: "grace", owner: "grace" },
  { company: "posthog.com", by: "grace", owner: "grace" },
];

async function freshTeam(): Promise<Map<string, string>> {
  const seeded = sql`(select id from "user" where email like ${`%@${SEED_DOMAIN}`})`;
  await db.execute(sql`delete from ${reports} where created_by in ${seeded}`);
  // Reports left behind by tests that stopped halfway belong to nobody who can sign in.
  await db.execute(sql`delete from ${reports} where created_by not in (select id from "user")`);
  await db.execute(sql`delete from ${members} where user_id in ${seeded}`);
  await db.execute(sql`delete from "user" where email like ${`%@${SEED_DOMAIN}`}`);
  const headers = new Headers({ host: `localhost:${portOf("research-agent")}` });
  const ids = new Map<string, string>();
  for (const person of PEOPLE) {
    const email = `${person.key}@${SEED_DOMAIN}`;
    const { user } = await auth.api.signUpEmail({
      body: { name: person.name, email, password: SEED_PASSWORD },
      headers,
    });
    await setRole(user.id, person.role);
    ids.set(person.key, user.id);
  }
  return ids;
}

// Four companies at a time, the same as four researchers per company running together.
async function researchAll(rows: { id: string; company: string }[]) {
  const queue = [...rows];
  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      await runResearch(row.id, row.company);
      console.log(`Researched ${row.company}`);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

const team = await freshTeam();
const id = (key: string | null) => (key ? (team.get(key) ?? null) : null);
const rows = [];
for (const [index, account] of ACCOUNTS.entries()) {
  const by = id(account.by) ?? "";
  const reportId = await startReport(account.company, by, account.by === "priya" ? null : by);
  await updateReport(reportId, { createdAt: new Date(Date.now() - (ACCOUNTS.length - index) * DAY) });
  rows.push({ id: reportId, company: account.company, owner: id(account.owner) });
}
await researchAll(rows);
for (const row of rows) await assignReport(row.id, row.owner);
console.log(
  `Sign in as ${PEOPLE.map((person) => `${person.key}@${SEED_DOMAIN}`).join(", ")} with "${SEED_PASSWORD}".`,
);
await pool.end();
process.exit(0);
