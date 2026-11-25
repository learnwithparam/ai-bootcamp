import { accountByEmail, addOwner } from "./queries";

// bun 05-admin-assistant/db/owner.ts you@example.com
// Lets one existing account use the admin assistant. Sign up first, then run this,
// and check the name and sign-up time it prints: the account is trusted from now on, not the email.

const email = process.argv[2];
if (!email?.includes("@")) throw new Error("Usage: bun 05-admin-assistant/db/owner.ts you@example.com");
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
await addOwner(account.id);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) can now use the admin assistant.`,
);
process.exit(0);
