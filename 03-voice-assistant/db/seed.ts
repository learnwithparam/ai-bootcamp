import { auth } from "@bootcamp/auth";
import { portOf } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import { whyNotDay } from "../rules/slots";
import { addDays, atClinicTime, clinicDay } from "../rules/time";
import { bookSlot } from "./diary";
import { addToTeam, db } from "./queries";
import { physios } from "./schema";

// bun run seed voice-assistant
// The physios, a receptionist who can open the front desk, and a few appointments the desk booked by hand,
// through the same bookSlot the phone uses. Calls are never seeded: every call on the desk was a real one.
// Running it again replaces all of it.

export const SEED_PASSWORD = "seeded clinic password";
export const RECEPTIONIST = { name: "Hannah Brooks", email: "front-desk@seed.learnwithparam.test" };

export const PHYSIOS = [
  { id: "maya", name: "Maya Okafor", focus: "sports injuries" },
  { id: "tom", name: "Tom Lindqvist", focus: "back and neck pain" },
  { id: "priya", name: "Priya Raman", focus: "rehab after surgery" },
];

// Who is already in the diary, by open day from tomorrow, so the phone has some times to work around.
const BOOKED = [
  {
    open: 0,
    clock: "09:00",
    physioId: "maya",
    callerName: "Leo Fischer",
    phone: "07700900101",
    reason: "Ankle sprain",
  },
  {
    open: 0,
    clock: "10:00",
    physioId: "tom",
    callerName: "Grace Mensah",
    phone: "07700900102",
    reason: "Lower back pain",
  },
  {
    open: 1,
    clock: "11:30",
    physioId: "priya",
    callerName: "Omar Haddad",
    phone: "07700900103",
    reason: "Knee, after surgery",
  },
  {
    open: 2,
    clock: "14:00",
    physioId: "maya",
    callerName: "Sofia Rossi",
    phone: "07700900104",
    reason: "Shoulder",
  },
];

function openDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let day = addDays(clinicDay(now), 1); days.length < count; day = addDays(day, 1)) {
    if (!whyNotDay(day, now)) days.push(day);
  }
  return days;
}

async function signUp(person: { name: string; email: string }): Promise<string> {
  await db.execute(sql`delete from "user" where email = ${person.email}`);
  const headers = new Headers({ host: `localhost:${portOf("voice-assistant")}` });
  const made = await auth.api.signUpEmail({ body: { ...person, password: SEED_PASSWORD }, headers });
  return made.user.id;
}

await db.execute(sql`truncate voice_assistant.lines, voice_assistant.messages, voice_assistant.bookings,
  voice_assistant.calls, voice_assistant.team, voice_assistant.physios`);
await db.insert(physios).values(PHYSIOS);
const days = openDays(3);
for (const { open, clock, ...booking } of BOOKED) {
  await bookSlot({ ...booking, start: atClinicTime(days[open] as string, clock), bookedBy: "front desk" });
}
await addToTeam(await signUp(RECEPTIONIST));
console.log(`Physios: ${PHYSIOS.length}. Appointments: ${BOOKED.length}.`);
console.log(`Sign in as the receptionist: ${RECEPTIONIST.email} / ${SEED_PASSWORD}`);
process.exit(0);
