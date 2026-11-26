const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// "4m", "3h", "Mon", or a date: how long ago, as short as an inbox shows it.
export function when(at: Date, now = new Date()): string {
  const gone = now.getTime() - at.getTime();
  if (gone < MINUTE) return "now";
  if (gone < HOUR) return `${Math.floor(gone / MINUTE)}m`;
  if (gone < DAY) return `${Math.floor(gone / HOUR)}h`;
  if (gone < 7 * DAY) return at.toLocaleDateString("en-GB", { weekday: "short" });
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
