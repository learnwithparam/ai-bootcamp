import { sql } from "drizzle-orm";
import { addToTeam, db } from "./queries";

// bun 03-voice-assistant/db/team.ts you@example.com
// Lets one account open the front desk. Make the account on the sign-in page first, then run this with that email.

const email = process.argv[2];
if (!email) throw new Error("Usage: bun 03-voice-assistant/db/team.ts you@example.com");
const found = await db.execute<{ id: string }>(sql`select id from "user" where email = ${email}`);
const id = found.rows[0]?.id;
if (!id) throw new Error(`No account with the email ${email}. Sign up first.`);
await addToTeam(id);
console.log(`${email} can now open the front desk.`);
process.exit(0);
