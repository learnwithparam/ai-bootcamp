export type DayCount = { day: string; signups: number };

// The database only returns days that had a signup. A chart needs every day, so the missing ones are 0.
// Today is passed in, so the rule is the same in a test.
export function everyDay(counts: DayCount[], days: number, today: string): DayCount[] {
  const byDay = new Map(counts.map((count) => [count.day, count.signups]));
  const end = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - 1 - index));
    const day = date.toISOString().slice(0, 10);
    return { day, signups: byDay.get(day) ?? 0 };
  });
}

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
