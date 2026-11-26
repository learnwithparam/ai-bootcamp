// What a call may use, so the clinic's voice bill stays tiny. Each limit is checked in code before a
// call starts (db/calls.ts) or while it runs (agent/worker.ts). Past one, the caller reads a sentence.

// One call ends after this, with a goodbye, whatever is happening on it.
export const CALL_SECONDS = 300;
// LiveKit's free Build plan allows five sessions at once.
export const CALLS_AT_ONCE = 5;
// All calls together, in a day.
export const CLINIC_MINUTES_PER_DAY = 60;
// One caller, by their browser, in a day.
export const CALLS_PER_CALLER_PER_DAY = 3;
// The most one call may cost, in dollars, counted against the day until the call is settled.
// Five minutes at the prices in rules/cost.ts is about $0.06. tests/agent.test.ts holds each real call under it.
export const CALL_CEILING_USD = 0.1;
// A cap on what one reply may write, so a reply stays short to say and cheap to make.
export const REPLY_TOKENS = 300;

export type Usage = { live: number; secondsToday: number; callerCallsToday: number };

export function limitMessage(usage: Usage): string | null {
  if (usage.callerCallsToday >= CALLS_PER_CALLER_PER_DAY) {
    return `You have called ${CALLS_PER_CALLER_PER_DAY} times today. Please call again tomorrow.`;
  }
  if (usage.secondsToday + CALL_SECONDS > CLINIC_MINUTES_PER_DAY * 60) {
    return "The phone line is closed for today. Please call again tomorrow.";
  }
  if (usage.live >= CALLS_AT_ONCE) return "All our lines are busy. Please try again in a few minutes.";
  return null;
}
