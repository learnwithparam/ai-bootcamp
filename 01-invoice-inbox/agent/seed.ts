import { readFileSync } from "node:fs";
import { join } from "node:path";
import { auth } from "@bootcamp/auth";
import { pool } from "@bootcamp/db";
import { findProduct } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import { addBill, moveBills } from "../db/bills";
import { db, setRole } from "../db/queries";
import { billEvents, bills } from "../db/schema";
import { SAMPLE_FOLDER, SAMPLE_ORDERS, seedOrders, seedSampleInvoices } from "../db/seed";
import { processBill } from "./agent";

// bun run seed invoice-inbox
// Two people made through the real sign-up path, a clerk and an approver, then six weeks of real Northwind
// bills, each read by the real model the way an upload is. The hard cases: orders not shipped yet,
// the same bill sent twice, and bills that sat long enough to be overdue.
// Running it again replaces both people and every bill.

export const SEED_PASSWORD = "seeded bills password";
const SEED_DOMAIN = "bills-seed.learnwithparam.test";
const DAY = 86_400_000;

const PEOPLE = [
  { name: "Ana Trujillo", email: `ana@${SEED_DOMAIN}`, role: "clerk" as const },
  { name: "Hanna Moos", email: `hanna@${SEED_DOMAIN}`, role: "approver" as const },
];

async function freshPeople() {
  await db.delete(bills);
  await db.execute(sql`delete from "user" where email like ${`%@${SEED_DOMAIN}`}`);
  const headers = new Headers({ host: `localhost:${findProduct("invoice-inbox").port}` });
  const made = [];
  for (const person of PEOPLE) {
    const { user } = await auth.api.signUpEmail({
      body: { name: person.name, email: person.email, password: SEED_PASSWORD },
      headers,
    });
    await setRole(user.id, person.role);
    made.push(person.name);
  }
  return made;
}

// The bills arrive oldest first over about 40 days. The second copy of 10250 comes in last week.
function arrivals() {
  const orders = [...SAMPLE_ORDERS, 10250];
  return orders.map((orderNumber, index) => ({
    orderNumber,
    receivedAt: new Date(Date.now() - (40 - Math.round((index * 40) / orders.length)) * DAY),
  }));
}

// Older bills already went through the approver, so every queue has real history in it.
async function moveOlderOn(approver: string, ids: { id: string; ageDays: number }[]) {
  const pick = (days: number) => ids.filter((bill) => bill.ageDays >= days).map((bill) => bill.id);
  const at = { actor: approver };
  await moveBills(pick(20), { ...at, from: ["approval"], to: "payment", text: "Approved for payment." });
  await moveBills(pick(30), { ...at, from: ["payment"], to: "paid", text: "Recorded as paid." });
}

// Events were written just now. Move each bill's events to the day it arrived: the upload first,
// the assistant's reading a minute later, and each person's step a day after their step before.
async function dateEvents() {
  await db.execute(sql`
    update ${billEvents} e set at = b.received_at + case
      when e.actor is null then interval '1 minute' + n.step * interval '1 millisecond'
      else n.step * interval '1 day' end
    from ${bills} b, (select id, row_number() over (partition by bill_id, actor is null order by at) - 1 as step
      from ${billEvents}) n
    where e.bill_id = b.id and n.id = e.id`);
}

await seedOrders();
await seedSampleInvoices();
const [clerk, approver] = await freshPeople();
if (!clerk || !approver) throw new Error("The seed people were not made.");
const made = [];
for (const bill of arrivals()) {
  const fileName = `invoice_${bill.orderNumber}.pdf`;
  const pdf = readFileSync(join(SAMPLE_FOLDER, fileName));
  const id = await addBill({ fileName, pdf, uploadedBy: clerk, receivedAt: bill.receivedAt });
  await processBill(id);
  made.push({ id, ageDays: (Date.now() - bill.receivedAt.getTime()) / DAY });
  console.log(`Read ${fileName}`);
}
await moveOlderOn(approver, made);
await dateEvents();
console.log(`Sign in as ${PEOPLE.map((person) => person.email).join(" or ")} with "${SEED_PASSWORD}".`);
await pool.end();
process.exit(0);
