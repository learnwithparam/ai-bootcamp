import { bookSlot, takenOn } from "../db/diary";
import { addLine } from "../db/queries";
import { phoneDigits, readBack, whyNotConfirm, whyNotPhone } from "../rules/hold";
import { offerSentence } from "../rules/offer";
import { freeSlots, type Physio, whyNotDay, whyNotStart } from "../rules/slots";
import { atClinicTime, isDay, spokenDay, spokenTime } from "../rules/time";
import type { CallState } from "./tools";

// Booking, one step per tool: find a free time, hold it and read it back, then book it on a yes.
// Each answer is a sentence for the agent to say in its own words; the rules decide.
export function physioNamed(state: CallState, name: string): Physio | undefined {
  const wanted = name.toLowerCase();
  return state.physios.find(
    (one) =>
      one.name.toLowerCase().includes(wanted) ||
      wanted.includes(one.name.split(" ")[0]?.toLowerCase() ?? "-"),
  );
}

export async function log(state: CallState, text: string): Promise<string> {
  await addLine(state.callId, "tool", text);
  return text;
}

export async function findSlots(
  state: CallState,
  args: { day: string; time?: string | null; physio?: string | null },
) {
  if (!isDay(args.day)) return log(state, `"${args.day}" is not a day. Use YYYY-MM-DD.`);
  const closed = whyNotDay(args.day, state.now());
  if (closed) return log(state, `${spokenDay(args.day)}: ${closed}`);
  const physio = args.physio ? physioNamed(state, args.physio) : undefined;
  const who = physio ? [physio] : state.physios;
  const free = freeSlots(args.day, who, await takenOn(args.day), state.now());
  if (free.length === 0) return log(state, `${spokenDay(args.day)} is fully booked. Offer another day.`);
  const wanted = args.time && /^\d{2}:\d{2}$/.test(args.time) ? args.time : null;
  return log(state, `${spokenDay(args.day)}: ${offerSentence(free, wanted)}`);
}

type HoldArgs = {
  day: string;
  time: string;
  physio: string | null;
  caller_name: string;
  phone: string;
  reason: string;
};

// The physio the caller named, or for "anyone", the first one free at that time.
async function physioFor(state: CallState, args: HoldArgs): Promise<Physio | string> {
  const start = atClinicTime(args.day, args.time);
  const taken = await takenOn(args.day);
  const free = (one: Physio) =>
    !taken.some((slot) => slot.physioId === one.id && slot.start.getTime() === start.getTime());
  if (args.physio) {
    const named = physioNamed(state, args.physio);
    if (!named) return `there is no physio called ${args.physio}.`;
    return free(named)
      ? named
      : `${spokenTime(args.time)} with ${named.name} is taken. Use find_slots for free times.`;
  }
  return (
    state.physios.find(free) ??
    `${spokenTime(args.time)} is taken with everyone. Use find_slots for free times.`
  );
}

export async function holdSlot(state: CallState, args: HoldArgs) {
  if (!isDay(args.day)) return log(state, `"${args.day}" is not a day. Use YYYY-MM-DD.`);
  const wrong = whyNotStart(args.day, args.time, state.now());
  if (wrong) return log(state, `Not held: ${wrong}`);
  const digits = phoneDigits(args.phone);
  if (!digits) return log(state, `Not held: ${whyNotPhone(args.phone)}`);
  const physio = await physioFor(state, args);
  if (typeof physio === "string") return log(state, `Not held: ${physio}`);
  const start = atClinicTime(args.day, args.time);
  const reason = args.reason.trim() || "Not said";
  state.hold = {
    physioId: physio.id,
    physio: physio.name,
    day: args.day,
    clock: args.time,
    start,
    callerName: args.caller_name.trim(),
    phone: digits,
    reason,
    callerTurns: state.callerTurns,
    at: state.now(),
  };
  return log(state, `Held, not booked yet. Read this back and ask if it is right: ${readBack(state.hold)}`);
}

export async function confirmBooking(state: CallState) {
  const hold = state.hold;
  const wrong = whyNotConfirm(hold, state.callerTurns, state.now());
  if (wrong || !hold) return log(state, `Not booked: ${wrong}`);
  const result = await bookSlot({ ...hold, bookedBy: "phone", callId: state.callId });
  state.hold = undefined;
  if ("taken" in result)
    return log(
      state,
      "Not booked: someone took that slot a moment ago. Use find_slots and offer another time.",
    );
  return log(state, `Booked: ${readBack(hold)} Tell the caller it is booked.`);
}
