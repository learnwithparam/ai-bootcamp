"use server";

import { revalidatePath } from "next/cache";
import { addReview } from "../db/people";
import { VERDICTS, type Verdict } from "../rules/review";
import { requireMember } from "./session";

export type ReviewForm = { error: string | null; sent: boolean };

// The review buttons on a run page. Who may review, and what, is decided in addReview, not here.
export async function sendReview(_before: ReviewForm, form: FormData): Promise<ReviewForm> {
  const person = await requireMember();
  const runId = String(form.get("runId") ?? "");
  const verdict = String(form.get("verdict") ?? "");
  if (!VERDICTS.includes(verdict as Verdict))
    return { error: "Choose approve or ask for changes.", sent: false };
  const result = await addReview({
    runId,
    reviewerId: person.id,
    verdict: verdict as Verdict,
    note: String(form.get("note") ?? ""),
  });
  if (!result.ok) return { error: result.reason, sent: false };
  revalidatePath("/", "layout");
  return { error: null, sent: true };
}
