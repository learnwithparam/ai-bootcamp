import type { Role } from "../rules/bill";
import { accountByEmail, setRole } from "./queries";

// bun 01-invoice-inbox/db/approver.ts you@example.com [approver|clerk]
// Gives one existing account a role on the accounts payable team. Sign up first, then run this,
// and check the name and sign-up time it prints: the account is trusted from now on, not the email.

const [email, given = "approver"] = process.argv.slice(2);
const usage = "Usage: bun 01-invoice-inbox/db/approver.ts you@example.com [approver|clerk]";
if (!email?.includes("@")) throw new Error(usage);
if (given !== "approver" && given !== "clerk") throw new Error(usage);
const role: Role = given;
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
await setRole(account.id, role);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) is now a ${role}.`,
);
process.exit(0);
