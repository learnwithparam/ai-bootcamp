import type { Role } from "../rules/board";
import { accountByEmail, addStaff } from "./queries";

// bun 07-legal-intake/db/lawyer.ts you@example.com [lawyer|paralegal]
// Adds one existing account to the firm's staff. Sign up first, then run this,
// and check the name and sign-up time it prints: the account is trusted from now on, not the email.

const [email, given = "lawyer"] = process.argv.slice(2);
const usage = "Usage: bun 07-legal-intake/db/lawyer.ts you@example.com [lawyer|paralegal]";
if (!email?.includes("@")) throw new Error(usage);
if (given !== "lawyer" && given !== "paralegal") throw new Error(usage);
const role: Role = given;
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
await addStaff(account.id, role);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) is now a ${role}.`,
);
process.exit(0);
