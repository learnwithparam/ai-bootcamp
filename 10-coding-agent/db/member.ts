import { isRole, ROLE_LABEL } from "../rules/review";
import { accountByEmail, addMember } from "./people";

// bun 10-coding-agent/db/member.ts you@example.com reviewer
// Puts one existing account on the team as a developer or a reviewer. Sign up first, then run this,
// and check the name and sign-up time it prints: the account is trusted from now on, not the email.

const [email, role = "developer"] = process.argv.slice(2);
if (!email?.includes("@") || !isRole(role))
  throw new Error("Usage: bun 10-coding-agent/db/member.ts you@example.com [developer|reviewer]");
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
await addMember(account.id, role);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) is now a ${ROLE_LABEL[role].toLowerCase()}.`,
);
process.exit(0);
