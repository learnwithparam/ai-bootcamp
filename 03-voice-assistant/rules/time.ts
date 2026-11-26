import { CLINIC, WEEKDAYS } from "./clinic";

// Clinic time. A day is "YYYY-MM-DD" and a clock is "HH:MM", both in the clinic's own time zone,
// so 10:30 means 10:30 in London whatever the server's zone, and the clocks changing moves nothing.

const format = new Intl.DateTimeFormat("en-GB", {
  timeZone: CLINIC.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parts(date: Date): Record<string, number> {
  const found: Record<string, number> = {};
  for (const part of format.formatToParts(date)) found[part.type] = Number(part.value);
  return found;
}

export function clinicDay(date: Date): string {
  const p = parts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function clinicClock(date: Date): string {
  const p = parts(date);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

// How far the clinic's clock is ahead of UTC at this moment, in minutes.
function offsetMinutes(date: Date): number {
  const p = parts(date);
  const asUtc = Date.UTC(p.year as number, (p.month as number) - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000);
}

// The moment a clinic day and clock fall on.
export function atClinicTime(day: string, clock: string): Date {
  const guess = new Date(`${day}T${clock}:00Z`);
  const first = new Date(guess.getTime() - offsetMinutes(guess) * 60_000);
  return new Date(guess.getTime() - offsetMinutes(first) * 60_000);
}

export function isDay(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T12:00:00Z`));
}

export function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function minutesOf(clock: string): number {
  const [hours, minutes] = clock.split(":").map(Number);
  return (hours as number) * 60 + (minutes as number);
}

export function clockOf(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// "Tuesday 1 December", the way the agent says a day out loud.
export function spokenDay(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  const month = date.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${month}`;
}

// "10:30am", "2pm".
export function spokenTime(clock: string): string {
  const minutes = minutesOf(clock);
  const hour = Math.floor(minutes / 60);
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  const rest = minutes % 60 ? `:${String(minutes % 60).padStart(2, "0")}` : "";
  return `${twelve}${rest}${hour < 12 ? "am" : "pm"}`;
}
