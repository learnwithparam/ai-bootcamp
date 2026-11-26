import type { Slot } from "./slots";
import { minutesOf, spokenTime } from "./time";

// What the phone offers from a day's free slots. A caller hears a few times, never the whole day,
// so the times must be the right few: the one they asked for if it is free, or the nearest to it.

export const TIMES_OFFERED = 4;

export type Opening = { clock: string; physios: string[] };

// The free slots as times, each with every physio free then, earliest first.
export function openings(free: Slot[]): Opening[] {
  const byClock = new Map<string, string[]>();
  for (const slot of free) byClock.set(slot.clock, [...(byClock.get(slot.clock) ?? []), slot.physio]);
  return [...byClock].map(([clock, physios]) => ({ clock, physios }));
}

// The times closest to the one asked for, or the earliest of the day when none was asked for.
export function nearest(all: Opening[], wanted: string | null, count = TIMES_OFFERED): Opening[] {
  if (!wanted) return all.slice(0, count);
  const distance = (one: Opening) => Math.abs(minutesOf(one.clock) - minutesOf(wanted));
  return [...all]
    .sort((a, b) => distance(a) - distance(b) || minutesOf(a.clock) - minutesOf(b.clock))
    .slice(0, count)
    .sort((a, b) => minutesOf(a.clock) - minutesOf(b.clock));
}

const said = (one: Opening) => `${spokenTime(one.clock)} with ${one.physios.join(" or ")}`;

// The sentence find_slots answers with.
export function offerSentence(free: Slot[], wanted: string | null): string {
  const all = openings(free);
  const asked = wanted ? all.find((one) => one.clock === wanted) : undefined;
  if (asked) return `${said(asked)} is free.`;
  const close = nearest(all, wanted);
  const lead = wanted
    ? `${spokenTime(wanted)} is not free. The nearest free times are`
    : "The first free times are";
  return `${lead}: ${close.map(said).join("; ")}. ${all.length} free times in all that day.`;
}
