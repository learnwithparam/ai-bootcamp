import type { Role } from "../rules/team";
import { accountByEmail, setRole } from "./queries";

// bun 06-research-agent/db/lead.ts you@example.com [lead|rep]
// Gives one existing account a role on the sales team. Sign up first, then run this,
// and check the name and sign-up time it prints: the account is trusted from now on, not the email.

const [email, given = "lead"] = process.argv.slice(2);
const usage = "Usage: bun 06-research-agent/db/lead.ts you@example.com [lead|rep]";
if (!email?.includes("@")) throw new Error(usage);
if (given !== "lead" && given !== "rep") throw new Error(usage);
const role: Role = given;
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
await setRole(account.id, role);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) is now a ${role === "lead" ? "sales lead" : "rep"}.`,
);
process.exit(0);
