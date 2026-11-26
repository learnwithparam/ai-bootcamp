import { isRole, ROLE_LABEL } from "../rules/team";
import { accountByEmail, addOperator } from "./people";

// bun 08-browser-agent/db/operator.ts you@example.com lead
// Puts one existing account on the intake desk as an assistant or the lead. Sign up first, then run this,
// and check the name and sign-up time it prints: the account is trusted from now on, not the email.

const [email, role = "assistant"] = process.argv.slice(2);
if (!email?.includes("@") || !isRole(role))
  throw new Error("Usage: bun 08-browser-agent/db/operator.ts you@example.com [assistant|lead]");
const account = await accountByEmail(email);
if (!account) throw new Error(`No account for ${email}. Create one on the sign-in page first.`);
await addOperator(account.id, role);
console.log(
  `${account.name} (${account.email}, signed up ${account.createdAt.toISOString()}) is now the ${ROLE_LABEL[role].toLowerCase()}.`,
);
process.exit(0);
