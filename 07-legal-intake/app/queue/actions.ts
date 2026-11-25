"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { resumeIntake, retryIntake, STOPPED } from "../../agent/agent";
import type { ActionState } from "../../components/ReviewForm";
import { claim, intakeById, updateIntake } from "../../db/queries";
import { type Decision, whyNotAccept, whyNotSend } from "../../rules/intake";
import { requireLawyer } from "../session";

// The lawyer's two answers. Each checks the rule on the page's side, claims the request, then resumes the saved graph.

function readDecision(form: FormData, lawyerId: string): Decision {
  return {
    choice: form.get("choice") === "accept" ? "accept" : "decline",
    note: String(form.get("note") ?? "")
      .trim()
      .slice(0, 1_000),
    clearedPossible: form.get("cleared") === "on",
    lawyerId,
  };
}

export async function decide(_previous: ActionState, form: FormData): Promise<ActionState> {
  const lawyer = await requireLawyer();
  const id = String(form.get("id"));
  const intake = await intakeById(id);
  if (!intake?.assessment) return { error: "This request is not waiting for a decision." };
  const decision = readDecision(form, lawyer.id);
  if (decision.choice === "accept") {
    const refused = whyNotAccept(intake.assessment, intake.conflicts, decision.clearedPossible);
    if (refused) return { error: refused };
  }
  if (!(await claim(id, "needs review", "drafting")))
    return { error: "Someone has already decided this request." };
  after(() => inBackground(id, () => resumeIntake(id, decision)));
  revalidatePath(`/queue/${id}`);
  return {};
}

export async function approve(_previous: ActionState, form: FormData): Promise<ActionState> {
  await requireLawyer();
  const id = String(form.get("id"));
  const letter = String(form.get("letter") ?? "");
  const refused = whyNotSend(letter, (await intakeById(id))?.conflicts ?? []);
  if (refused) return { error: refused };
  if (!(await claim(id, "letter ready", "sending")))
    return { error: "This letter is not waiting for approval." };
  try {
    await resumeIntake(id, letter);
  } catch (error) {
    console.error(`Request ${id}: the letter was not saved:`, error);
    await updateIntake(id, { status: "letter ready" });
    return { error: "The letter was not saved. Try again, and check the server log if it fails again." };
  }
  revalidatePath(`/queue/${id}`);
  return {};
}

// A step that failed, such as the model not answering, runs again from the last saved step.
export async function retry(_previous: ActionState, form: FormData): Promise<ActionState> {
  await requireLawyer();
  const id = String(form.get("id"));
  const intake = await intakeById(id);
  const next = intake?.decision ? "drafting" : "assessing";
  if (!(await claim(id, "failed", next))) return { error: "This request has not failed." };
  after(() => inBackground(id, () => retryIntake(id)));
  revalidatePath(`/queue/${id}`);
  return {};
}

async function inBackground(id: string, work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    console.error(`Request ${id} stopped:`, error);
    await updateIntake(id, { status: "failed", error: STOPPED });
  }
}
