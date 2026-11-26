import { and, asc, eq, gte, lt } from "drizzle-orm";
import type { Physio, Taken } from "../rules/slots";
import { addDays, atClinicTime } from "../rules/time";
import { db } from "./queries";
import { bookings, physios } from "./schema";

// The diary: who works here, what is taken, and booking a slot. Both the phone and the front desk book
// through bookSlot, so the database's one-booking-per-slot rule holds for everyone.

export type Booking = typeof bookings.$inferSelect;

export async function allPhysios(): Promise<Physio[]> {
  return db.select().from(physios).orderBy(asc(physios.name));
}

// The booked appointments between two clinic days, the first included and the last not.
export async function bookedBetween(fromDay: string, toDay: string): Promise<Booking[]> {
  return db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "booked"),
        gte(bookings.start, atClinicTime(fromDay, "00:00")),
        lt(bookings.start, atClinicTime(toDay, "00:00")),
      ),
    )
    .orderBy(asc(bookings.start));
}

export async function takenOn(day: string): Promise<Taken[]> {
  return (await bookedBetween(day, addDays(day, 1))).map(({ physioId, start }) => ({ physioId, start }));
}

type NewBooking = Pick<Booking, "physioId" | "start" | "callerName" | "phone" | "reason" | "bookedBy"> & {
  callId?: string;
};

// Books the slot, or says it was taken. The unique index decides, not a read before the write.
export async function bookSlot(booking: NewBooking): Promise<{ booked: Booking } | { taken: true }> {
  const [row] = await db.insert(bookings).values(booking).onConflictDoNothing().returning();
  return row ? { booked: row } : { taken: true };
}

// The caller's booked appointments from now on, found by the phone number they booked with.
export async function bookingsFor(phone: string, now: Date): Promise<Booking[]> {
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.phone, phone), eq(bookings.status, "booked"), gte(bookings.start, now)))
    .orderBy(asc(bookings.start));
}

// Cancels one appointment, only when the phone number matches the one it was booked with.
export async function cancelBooking(id: string, phone: string): Promise<boolean> {
  const done = await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, id), eq(bookings.phone, phone), eq(bookings.status, "booked")))
    .returning({ id: bookings.id });
  return done.length > 0;
}

// The front desk cancels any appointment.
export async function cancelById(id: string) {
  await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, id));
}
