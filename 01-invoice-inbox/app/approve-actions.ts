"use server";

import { revalidatePath } from "next/cache";
import { moveBills } from "../db/bills";
import { may } from "../rules/bill";
import type { FormState } from "./actions";
import { requireMember } from "./session";

const plural = (count: number) => `${count} bill${count === 1 ? "" : "s"}`;
const idsOf = (form: FormData) => form.getAll("ids").map(String);

// An approver signs off bills, one or many at once. A clerk's click is refused here, not only hidden on screen.
export async function approveBills(_previous: FormState, form: FormData): Promise<FormState> {
  const member = await requireMember();
  if (!may(member.role, "approve")) return { error: "Only an approver can approve bills." };
  const ids = idsOf(form);
  if (ids.length === 0) return { error: "Select the bills to approve." };
  const moved = await moveBills(ids, {
    from: ["approval"],
    to: "payment",
    actor: member.name,
    text: "Approved for payment.",
  });
  revalidatePath("/bills");
  return moved
    ? { done: `Approved ${plural(moved)}.` }
    : { error: "None of these bills were waiting for approval." };
}

// The approver records that the payment run went out. Payment itself happens in the bank, not here.
export async function recordPayment(_previous: FormState, form: FormData): Promise<FormState> {
  const member = await requireMember();
  if (!may(member.role, "pay")) return { error: "Only an approver can record a payment." };
  const ids = idsOf(form);
  if (ids.length === 0) return { error: "Select the bills that were paid." };
  const moved = await moveBills(ids, {
    from: ["payment"],
    to: "paid",
    actor: member.name,
    text: "Recorded as paid.",
  });
  revalidatePath("/bills");
  return moved
    ? { done: `Recorded ${plural(moved)} as paid.` }
    : { error: "None of these bills were waiting for payment." };
}

// An approver who disagrees sends the bill back to the clerks, with a note that says why.
export async function sendBack(_previous: FormState, form: FormData): Promise<FormState> {
  const member = await requireMember();
  if (!may(member.role, "approve")) return { error: "Only an approver can send a bill back." };
  const note = String(form.get("note") ?? "").trim();
  if (!note) return { error: "Write a note that says what to change." };
  const moved = await moveBills(idsOf(form), {
    from: ["approval"],
    to: "review",
    actor: member.name,
    text: `Sent back: ${note}`,
  });
  revalidatePath("/bills");
  return moved ? { done: "Sent back to review." } : { error: "This bill is no longer waiting for approval." };
}
