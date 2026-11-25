import { stripe } from "@bootcamp/stripe";
import { sql } from "drizzle-orm";
import { makeCode } from "./coupons";
import { db } from "./queries";
import { SEED_PASSWORD, seedCustomers, seedTeam, TEAM } from "./seed-people";

// bun run seed admin-assistant
// Customers over 90 days, an owner and a staff member, discount codes in Stripe's test mode,
// and two past newsletters. Running it again replaces the people and the newsletters.

const CODES = [
  { code: "WELCOME10", percentOff: 10, duration: "once" as const, active: true },
  { code: "LAUNCH25", percentOff: 25, duration: "repeating" as const, months: 3, active: true },
  { code: "STUDENT40", percentOff: 40, duration: "repeating" as const, months: 12, active: true },
  { code: "SPRING20", percentOff: 20, duration: "once" as const, active: false },
];

// Stripe keeps switched-off codes, so a code is made only when no code of that name exists at all.
async function seedCodes() {
  for (const { active, ...request } of CODES) {
    const found = await stripe().promotionCodes.list({ code: request.code, limit: 1 });
    if (found.data.length > 0) continue;
    const made = await makeCode(request);
    if (!active) await stripe().promotionCodes.update(made.promotionCodeId, { active: false });
  }
}

const SENT = `# Two new live labs this month

Hello from the school. Two labs open for booking this week.

## Upcoming live labs

- **Invoice agents.** Read real bills and match them to orders. [Book a seat](https://www.learnwithparam.com/live)
- **Browser agents.** Fill a real form with a person approving each submit. [Book a seat](https://www.learnwithparam.com/live)

## Worth reading

- [How we test every lab before it ships](https://www.learnwithparam.com/blog)

See you there.`;

const DRAFT = `# The agent that checks its own work

This week is about one habit: an agent should prove a result before it says done.

## Upcoming live labs

- **Coding agents.** Watch an agent fix a real bug and run the tests. [Book a seat](https://www.learnwithparam.com/live)

## Worth reading

- [Why we never trust a model's own score](https://www.learnwithparam.com/blog)`;

async function seedNewsletters(ownerId: string) {
  await db.execute(sql`delete from admin_assistant.newsletters`);
  await db.execute(sql`insert into admin_assistant.newsletters
    (subject, body, status, written_by, approved_by, created_at, updated_at) values
    ('Two new live labs this month', ${SENT}, 'approved', ${ownerId}, ${ownerId},
      now() - interval '12 days', now() - interval '11 days'),
    ('The agent that checks its own work', ${DRAFT}, 'draft', ${ownerId}, null,
      now() - interval '1 day', now() - interval '1 day')`);
}

const customers = await seedCustomers();
const ownerId = await seedTeam();
await seedCodes();
await seedNewsletters(ownerId);
console.log(`Customers: ${customers}. Codes: ${CODES.length}. Newsletters: 2.`);
for (const member of TEAM) console.log(`Sign in as ${member.role}: ${member.email} / ${SEED_PASSWORD}`);
process.exit(0);
