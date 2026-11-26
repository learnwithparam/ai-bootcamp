import { accountByEmail, addMember } from "./queries";

// bun 09-team-workspace/db/member.ts you@example.com [--admin]
// Adds one existing account to the team. An admin may also add connectors for everyone.
// Sign up first, then run this, and check the name and sign-up time it prints: the account is trusted, not the email.

const email = process.argv[2];
const role = process.argv.includes("--admin") ? "admin" : "member";
if (!email?.includes("@"))
  throw new Error("Usage: bun 09-team-workspace/db/member.ts you@example.com [--admin]");
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
await addMember(account.id, role);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) is now a ${role} of the team workspace.`,
);
process.exit(0);
