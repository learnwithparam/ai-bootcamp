import { BOOK_DAYS_AHEAD, hoursInWords } from "../rules/clinic";
import type { Physio } from "../rules/slots";
import { addDays, clinicClock, clinicDay, spokenDay } from "../rules/time";
import instructions from "./instructions.md" with { type: "text" };

// The instructions, plus what the agent must know today: the date, the hours, the team, and which date
// each coming day is. A model counting days from "next Tuesday" gets it wrong; a table it reads does not.
export function promptFor(now: Date, physios: Physio[]): string {
  const today = clinicDay(now);
  const days = Array.from({ length: Math.min(14, BOOK_DAYS_AHEAD) }, (_, i) => addDays(today, i));
  return [
    instructions,
    `Today is ${spokenDay(today)} (${today}) and the time is ${clinicClock(now)}.`,
    `Opening hours: ${hoursInWords()}`,
    `The physios: ${physios.map((physio) => `${physio.name} (${physio.focus})`).join("; ")}.`,
    "The coming days, for the day field of every tool:",
    ...days.map(
      (day, i) => `- ${spokenDay(day)} is ${day}${i === 0 ? " (today)" : i === 1 ? " (tomorrow)" : ""}`,
    ),
  ].join("\n");
}

export const GREETING = "Hello, Harbour Physio. How can I help?";
export const GOODBYE = "Thank you for calling Harbour Physio. Goodbye.";
export const TIME_UP =
  "I'm sorry, our calls are limited to five minutes. Please call back, or leave a message next time. Goodbye.";
