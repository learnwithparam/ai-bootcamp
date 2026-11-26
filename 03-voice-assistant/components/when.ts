import { slotOf } from "../rules/slots";
import { clinicClock, clinicDay, spokenDay, spokenTime } from "../rules/time";

// Times on the front desk's pages, always in the clinic's own time zone, whatever the browser's is.
export function appointmentTime(start: Date): string {
  const slot = slotOf(start);
  return `${spokenDay(slot.day)}, ${spokenTime(slot.clock)}`;
}

export function clockTime(at: Date): string {
  return spokenTime(clinicClock(at));
}

export function callTime(at: Date, now: Date): string {
  const day = clinicDay(at);
  return day === clinicDay(now) ? `Today, ${clockTime(at)}` : `${spokenDay(day)}, ${clockTime(at)}`;
}

export function duration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

// A call's cost in cents, to the hundredth, because a whole call costs a few cents.
export function cents(usd: number): string {
  return `${(usd * 100).toFixed(2)}¢`;
}
