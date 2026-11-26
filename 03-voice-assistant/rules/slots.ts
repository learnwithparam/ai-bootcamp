import { BOOK_DAYS_AHEAD, HOURS, SLOT_MINUTES, WEEKDAYS } from "./clinic";
import { addDays, atClinicTime, clinicClock, clinicDay, clockOf, minutesOf, weekdayOf } from "./time";

// Which appointments exist, and why a time cannot be booked. The diary in Postgres says what is taken.

export type Physio = { id: string; name: string; focus: string };
export type Taken = { physioId: string; start: Date };
export type Slot = { physioId: string; physio: string; day: string; clock: string; start: Date };

// Every start time on a day, in clinic time: from opening, one slot apart, ending by closing.
export function startsOn(day: string): string[] {
  const hours = HOURS[weekdayOf(day)];
  if (!hours) return [];
  const starts: string[] = [];
  for (let at = minutesOf(hours.opens); at + SLOT_MINUTES <= minutesOf(hours.closes); at += SLOT_MINUTES) {
    starts.push(clockOf(at));
  }
  return starts;
}

// Why the phone may not book this day, or null. Said to the caller as it is.
export function whyNotDay(day: string, now: Date): string | null {
  const today = clinicDay(now);
  if (day < today) return "That day has already gone.";
  if (day > addDays(today, BOOK_DAYS_AHEAD)) {
    return `The phone books up to ${BOOK_DAYS_AHEAD} days ahead. For later dates, leave a message and the front desk will call back.`;
  }
  if (!HOURS[weekdayOf(day)]) return `We are closed on ${WEEKDAYS[weekdayOf(day)]}s.`;
  return null;
}

// Why this start time cannot be booked, or null.
export function whyNotStart(day: string, clock: string, now: Date): string | null {
  const wrongDay = whyNotDay(day, now);
  if (wrongDay) return wrongDay;
  if (!startsOn(day).includes(clock)) {
    const hours = HOURS[weekdayOf(day)];
    return `Appointments start every ${SLOT_MINUTES} minutes from ${hours?.opens}, and the last one starts ${SLOT_MINUTES} minutes before ${hours?.closes}.`;
  }
  if (atClinicTime(day, clock) <= now) return "That time has already gone.";
  return null;
}

// The free appointments on a day, for every physio or one of them, earliest first.
export function freeSlots(day: string, physios: Physio[], taken: Taken[], now: Date): Slot[] {
  if (whyNotDay(day, now)) return [];
  const busy = new Set(taken.map((one) => `${one.physioId} ${one.start.getTime()}`));
  const free: Slot[] = [];
  for (const clock of startsOn(day)) {
    const start = atClinicTime(day, clock);
    if (start <= now) continue;
    for (const physio of physios) {
      if (busy.has(`${physio.id} ${start.getTime()}`)) continue;
      free.push({ physioId: physio.id, physio: physio.name, day, clock, start });
    }
  }
  return free;
}

// The slot this moment is, in clinic time, so a saved booking can be said back.
export function slotOf(start: Date): { day: string; clock: string } {
  return { day: clinicDay(start), clock: clinicClock(start) };
}
