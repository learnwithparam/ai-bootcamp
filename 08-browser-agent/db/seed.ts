import { INBOX } from "./inbox";
import { db } from "./queries";
import { emails } from "./schema";

// bun run seed browser-agent
// Loads the sample inbox in db/inbox.ts. Running it again replaces the emails, and removes every run made on them.

await db.transaction(async (tx) => {
  await tx.delete(emails);
  await tx.insert(emails).values(INBOX);
});
console.log(`Inbox: ${INBOX.length} emails`);
process.exit(0);
