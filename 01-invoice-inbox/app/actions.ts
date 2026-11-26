"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { processBill } from "../agent/agent";
import { addBill, findBill, moveBills } from "../db/bills";
import { type BillRecord, parseAmount } from "../rules/bill";
import { formatCents, toCents } from "../rules/invoice";
import { requireMember } from "./session";

export type FormState = { error?: string; done?: string };

const LIMIT = 10 * 1024 * 1024;

// Saves each PDF as "reading" and answers at once. The assistant reads them after the response is sent,
// and the worklist refreshes while any bill is still being read.
export async function uploadBills(_previous: FormState, form: FormData): Promise<FormState> {
  const member = await requireMember();
  const files = form
    .getAll("bills")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return { error: "Choose at least one PDF." };
  const wrong = files.find((file) => file.type !== "application/pdf" || file.size > LIMIT);
  if (wrong) return { error: `${wrong.name} is not a PDF under 10 MB. Nothing was uploaded.` };
  const ids: string[] = [];
  for (const file of files) {
    ids.push(
      await addBill({
        fileName: file.name,
        pdf: Buffer.from(await file.arrayBuffer()),
        uploadedBy: member.name,
      }),
    );
  }
  after(() => Promise.all(ids.map(processBill)));
  revalidatePath("/bills");
  return {
    done: `${files.length} bill${files.length === 1 ? "" : "s"} uploaded. The assistant is reading them.`,
  };
}

const OPEN = ["review", "hold", "unreadable"] as const;

function payFrom(bill: BillRecord, form: FormData): number | string {
  const billed = toCents(bill.extracted?.total ?? 0);
  const cents = parseAmount(String(form.get("amount") ?? ""), billed);
  return cents ?? `Enter an amount between $0.01 and ${formatCents(billed)}.`;
}

// A clerk decides a bill that needs review. Each choice is logged with the note, and only a bill
// that still needs review moves, so two people deciding at once never overwrite each other.
export async function reviewBill(_previous: FormState, form: FormData): Promise<FormState> {
  const member = await requireMember();
  const bill = await findBill(String(form.get("id")));
  if (!bill) return { error: "This bill no longer exists." };
  const choice = String(form.get("choice"));
  const note = String(form.get("note") ?? "").trim();
  const move = { from: [...OPEN], actor: member.name };
  let moved = 0;
  if (choice === "accept" && bill.fix?.kind === "pay") {
    const text = `Accepted the suggestion: pay ${formatCents(bill.fix.payCents)}. Sent for approval.`;
    moved = await moveBills([bill.id], { ...move, to: "approval", payCents: bill.fix.payCents, text });
  } else if (choice === "pay") {
    const cents = payFrom(bill, form);
    if (typeof cents === "string") return { error: cents };
    if (!note) return { error: "Write a note that says why this amount." };
    moved = await moveBills([bill.id], {
      ...move,
      to: "approval",
      payCents: cents,
      text: `Pay ${formatCents(cents)}: ${note}`,
    });
  } else if (choice === "hold" || choice === "reject") {
    const reason = note || (bill.fix?.kind === choice ? bill.fix.reason : "");
    if (!reason) return { error: "Write a note that says why." };
    const to = choice === "hold" ? "hold" : "rejected";
    moved = await moveBills([bill.id], {
      ...move,
      to,
      payCents: null,
      text: `${choice === "hold" ? "Held" : "Rejected"}: ${reason}`,
    });
  } else return { error: "Choose what to do with this bill." };
  if (!moved) return { error: "Someone else decided this bill first. Reload to see what they did." };
  revalidatePath("/bills");
  return { done: "Saved." };
}

// Reads a held or unreadable bill again, for example once the delivery has arrived.
export async function readAgain(form: FormData): Promise<void> {
  const member = await requireMember();
  const id = String(form.get("id"));
  const text = "Asked the assistant to read and check it again.";
  if (await moveBills([id], { from: [...OPEN], to: "reading", actor: member.name, text }))
    after(() => processBill(id));
  revalidatePath("/bills");
}
