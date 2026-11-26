// Harbour Physio: when it is open, how long an appointment is, and how far ahead the phone may book.
// The agent never decides any of this. It asks the rules, and the rules have the last word.

export const CLINIC = { name: "Harbour Physio", timeZone: "Europe/London" };

// The name the site asks LiveKit for when it sends a call to the worker in agent/worker.ts.
export const AGENT_NAME = "harbour-desk";

export const SLOT_MINUTES = 30;
export const BOOK_DAYS_AHEAD = 28;

export type Hours = { opens: string; closes: string };

// Opening hours by weekday, 0 being Sunday, in clinic time. A day with no hours is closed.
export const HOURS: Record<number, Hours | undefined> = {
  1: { opens: "08:00", closes: "18:00" },
  2: { opens: "08:00", closes: "18:00" },
  3: { opens: "08:00", closes: "18:00" },
  4: { opens: "08:00", closes: "20:00" },
  5: { opens: "08:00", closes: "17:00" },
  6: { opens: "09:00", closes: "13:00" },
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The hours as one sentence, for the agent to read out and for the caller's page.
export function hoursInWords(): string {
  const days = [1, 2, 3, 4, 5, 6].map((day) => {
    const hours = HOURS[day] as Hours;
    return `${WEEKDAYS[day]} ${hours.opens} to ${hours.closes}`;
  });
  return `${days.join(", ")}. Closed on Sunday.`;
}
