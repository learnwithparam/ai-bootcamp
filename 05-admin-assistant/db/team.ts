import { accountByEmail, addToTeam } from "./queries";
import type { Role } from "./schema";

// bun 05-admin-assistant/db/team.ts you@example.com owner
// bun 05-admin-assistant/db/team.ts helper@example.com staff
// Adds one existing account to the admin team. Sign up first, then run this, and check the name and sign-up time
// it prints: the account is trusted from now on, not the email.

const [email, role] = process.argv.slice(2);
if (!email?.includes("@") || (role !== "owner" && role !== "staff")) {
  throw new Error("Usage: bun 05-admin-assistant/db/team.ts you@example.com owner|staff");
}
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
await addToTeam(account.id, role as Role);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) is now ${role}.`,
);
process.exit(0);
