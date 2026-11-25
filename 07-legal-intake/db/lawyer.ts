import { accountByEmail, addLawyer } from "./queries";

// bun 07-legal-intake/db/lawyer.ts you@example.com
// Lets one existing account open the review queue. Sign up first, then run this,
// and check the name and sign-up time it prints: the account is trusted from now on, not the email.

const email = process.argv[2];
if (!email?.includes("@")) throw new Error("Usage: bun 07-legal-intake/db/lawyer.ts you@example.com");
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
await addLawyer(account.id);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) can now review requests.`,
);
process.exit(0);
