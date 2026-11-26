import { llm } from "@livekit/agents";
import { z } from "zod";
import { bookingsOfCaller, cancelBooking } from "../db/diary";
import { takeMessage } from "../db/queries";
import { type Hold, phoneDigits, spokenPhone, whyNotPhone } from "../rules/hold";
import { type Physio, slotOf } from "../rules/slots";
import { spokenDay, spokenTime } from "../rules/time";
import { confirmBooking, findSlots, holdSlot, log } from "./booking";

// The agent's hands on one call. Every answer is a sentence for the agent to say in its own words.
// The rules decide; a tool that says no tells the agent why, and the call goes on.

export type CallState = {
  callId: string;
  physios: Physio[];
  hold?: Hold;
  // How many times the caller has spoken so far, counted by the worker.
  callerTurns: number;
  endedBecause?: string;
  now: () => Date;
  end: () => void;
};

const day = z.string().describe("The day, as YYYY-MM-DD from the table of coming days");
const phone = z.string().describe("The caller's phone number, digits as they said it");
const callerName = z.string().describe("The caller's full name, as they said it");

async function findBookings(state: CallState, args: { phone: string; caller_name: string }) {
  const digits = phoneDigits(args.phone);
  if (!digits) return log(state, `Not found: ${whyNotPhone(args.phone)}`);
  const found = await bookingsOfCaller(digits, args.caller_name, state.now());
  if (found.length === 0)
    return log(state, `No coming appointments for ${args.caller_name} on ${spokenPhone(digits)}.`);
  const list = found.map((one) => {
    const slot = slotOf(one.start);
    const who = state.physios.find((physio) => physio.id === one.physioId)?.name ?? "a physio";
    return `${spokenDay(slot.day)} at ${spokenTime(slot.clock)} with ${who} (booking ${one.id})`;
  });
  return log(state, `Appointments for ${args.caller_name}: ${list.join("; ")}.`);
}

// Cancels only an appointment the caller could find: their number and their name.
async function cancel(state: CallState, args: { booking_id: string; phone: string; caller_name: string }) {
  const digits = phoneDigits(args.phone);
  const theirs = digits ? await bookingsOfCaller(digits, args.caller_name, state.now()) : [];
  const ok =
    digits &&
    theirs.some((one) => one.id === args.booking_id) &&
    (await cancelBooking(args.booking_id, digits));
  return log(
    state,
    ok ? "Cancelled. Tell the caller." : "Not cancelled: no such appointment for that name and phone number.",
  );
}

async function message(state: CallState, args: { caller_name: string; phone: string; note: string }) {
  const digits = phoneDigits(args.phone);
  if (!digits) return log(state, `Not taken: ${whyNotPhone(args.phone)}`);
  await takeMessage({ callId: state.callId, callerName: args.caller_name, phone: digits, note: args.note });
  return log(state, "Message taken. Tell the caller the front desk will call back on the next working day.");
}

function bookingTools(state: CallState) {
  return {
    find_slots: llm.tool({
      description: "Free appointments on one day: the time the caller asked for, or the nearest free ones.",
      parameters: z.object({
        day,
        time: z.string().nullable().describe("The time the caller asked for, HH:MM 24 hour clock, or null"),
        physio: z.string().nullable().describe("A physio's name, or null for anyone"),
      }),
      execute: (args) => findSlots(state, args),
    }),
    hold_slot: llm.tool({
      description: "Hold one appointment and get the details to read back. Books nothing.",
      parameters: z.object({
        day,
        time: z.string().describe("Start time, HH:MM, 24 hour clock"),
        physio: z
          .string()
          .nullable()
          .describe("A physio's name, or null when the caller is happy with anyone"),
        caller_name: z.string(),
        phone,
        reason: z.string().describe("What the appointment is for, in a few words"),
      }),
      execute: (args) => holdSlot(state, args),
    }),
    confirm_booking: llm.tool({
      description: "Book the held appointment, after the caller said the details are right.",
      parameters: z.object({}),
      execute: () => confirmBooking(state),
    }),
  };
}

function deskTools(state: CallState) {
  return {
    find_my_bookings: llm.tool({
      description: "The caller's coming appointments, by the name and phone number they booked with.",
      parameters: z.object({ phone, caller_name: callerName }),
      execute: (args) => findBookings(state, args),
    }),
    cancel_booking: llm.tool({
      description: "Cancel one of the caller's appointments.",
      parameters: z.object({ booking_id: z.string(), phone, caller_name: callerName }),
      execute: (args) => cancel(state, args),
    }),
    take_message: llm.tool({
      description: "Leave a message for the front desk to call the caller back.",
      parameters: z.object({ caller_name: z.string(), phone, note: z.string() }),
      execute: (args) => message(state, args),
    }),
    end_call: llm.tool({
      description: "Say goodbye and hang up. It says the goodbye for you.",
      parameters: z.object({}),
      execute: async () => {
        state.endedBecause = "agent said goodbye";
        state.end();
        return "Call ending.";
      },
    }),
  };
}

export function callTools(state: CallState) {
  return { ...bookingTools(state), ...deskTools(state) };
}
