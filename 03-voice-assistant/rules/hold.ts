import { spokenDay, spokenTime } from "./time";

// Nothing is booked from one sentence. The agent holds a slot first and reads it back. Only after the
// caller has spoken again may it confirm, so a misheard name, number or day is caught on the call.

export const HOLD_MINUTES = 5;

export type Hold = {
  physioId: string;
  physio: string;
  day: string;
  clock: string;
  start: Date;
  callerName: string;
  phone: string;
  reason: string;
  // How many times the caller had spoken when the slot was held.
  callerTurns: number;
  at: Date;
};

// The words said back to the caller before anything is booked.
export function readBack(hold: Hold): string {
  return `${spokenDay(hold.day)} at ${spokenTime(hold.clock)} with ${hold.physio}, for ${hold.callerName}, phone ${spokenPhone(hold.phone)}.`;
}

// Why the held slot may not be booked yet, or null.
export function whyNotConfirm(hold: Hold | undefined, callerTurns: number, now: Date): string | null {
  if (!hold) return "Nothing is held. Hold a slot and read it back to the caller first.";
  if (now.getTime() - hold.at.getTime() > HOLD_MINUTES * 60_000) {
    return "The hold ran out. Check the slot is still free and hold it again.";
  }
  if (callerTurns <= hold.callerTurns) {
    return "Read the appointment back to the caller and wait for them to say yes before you book it.";
  }
  return null;
}

// A UK phone number as digits, or null when it is not one. Speech to text writes "07700 900123",
// "+44 7700 900123" or "0 7 7 0 0...": spaces and a leading +44 are allowed, anything else is not.
export function phoneDigits(text: string): string | null {
  let digits = text.replace(/[\s().-]/g, "");
  if (digits.startsWith("+44")) digits = `0${digits.slice(3)}`;
  return /^0\d{9,10}$/.test(digits) ? digits : null;
}

// What to tell the agent when a number is not a phone number. Callers pause between the groups of a number,
// so the agent often has only the first part: it is told to ask for the rest, not to start again.
export function whyNotPhone(text: string): string {
  const count = text.replace(/\D/g, "").length;
  if (count > 0 && count < 10)
    return `that is only ${count} digits, and a UK number has 11. Ask for the rest of the number, then put the parts together.`;
  return "that is not a UK phone number. Ask for it again, digit by digit.";
}

// "07700 900123" read out in groups, so the caller can check it.
export function spokenPhone(digits: string): string {
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}
