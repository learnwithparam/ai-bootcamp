"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { runEmail, sendApproved } from "../agent/agent";
import type { ActionState } from "../components/ActionButton";
import { claim, startRun, updateRun } from "../db/queries";
import { whyNotStart } from "../rules/run";
import { requireOperator } from "./session";

// The operator's three buttons. Each claims the run first, so two clicks never do the work twice.

export async function start(_previous: ActionState, form: FormData): Promise<ActionState> {
  await requireOperator();
  const started = await startRun(String(form.get("emailId")), whyNotStart);
  if ("refused" in started) return { error: started.refused };
  after(() => runEmail(started.id));
  redirect(`/runs/${started.id}`);
}

export async function approve(_previous: ActionState, form: FormData): Promise<ActionState> {
  const operator = await requireOperator();
  const id = String(form.get("runId"));
  if (!(await claim(id, "waiting", "submitting"))) return { error: "This run is not waiting for you." };
  await updateRun(id, { decidedBy: operator.name });
  after(() => sendApproved(id));
  revalidatePath(`/runs/${id}`);
  return {};
}

export async function stop(_previous: ActionState, form: FormData): Promise<ActionState> {
  const operator = await requireOperator();
  const id = String(form.get("runId"));
  if (!(await claim(id, "waiting", "stopped"))) return { error: "This run is not waiting for you." };
  await updateRun(id, {
    decidedBy: operator.name,
    reason: `${operator.name} stopped it.`,
    finishedAt: new Date(),
  });
  revalidatePath(`/runs/${id}`);
  return {};
}
