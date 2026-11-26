// Dates as the desk reads them: "26 Nov, 09:14". One format on every screen.
const FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export const when = (date: Date | string) => FORMAT.format(new Date(date));
