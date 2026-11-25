import { accountByEmail, addToSupportTeam } from "./queries";

// bun 02-site-assistant/db/support.ts teammate@example.com
// Lets one existing account read the support queue. Run it after your teammate has signed up,
// and check the name and sign-up time it prints: the account is trusted from now on, not the email.

const email = process.argv[2];
if (!email?.includes("@")) throw new Error("Usage: bun 02-site-assistant/db/support.ts teammate@example.com");
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Ask them to create one on the sign-in page first.`);
await addToSupportTeam(account.id);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) can now read the support queue.`,
);
process.exit(0);
