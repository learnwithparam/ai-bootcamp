"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { runEmail, sendApproved } from "../agent/agent";
import type { ActionState } from "../components/ActionButton";
import { moveRun, startRun } from "../db/queries";
import { STOPPABLE, whyNotStart } from "../rules/run";
import { may } from "../rules/team";
import { requireOperator } from "./session";

// The intake desk's four buttons. Each moves the run only from the status the person saw,
// so two clicks never do the work twice, and a stop always wins over the agent's next step.

export async function start(_previous: ActionState, form: FormData): Promise<ActionState> {
  await requireOperator();
  const started = await startRun(String(form.get("emailId")), whyNotStart);
  if ("refused" in started) return { error: started.refused };
  after(() => runEmail(started.id));
  redirect(`/runs/${started.id}`);
}

export async function approve(_previous: ActionState, form: FormData): Promise<ActionState> {
  const person = await requireOperator();
  if (!may(person.role, "approve")) return { error: "Only the intake lead approves a request." };
  const id = String(form.get("runId"));
  const moved = await moveRun(id, ["waiting"], "submitting", { decidedBy: person.name });
  if (!moved) return { error: "This run is not waiting for approval any more." };
  after(() => sendApproved(id));
  revalidatePath(`/runs/${id}`);
  return {};
}

export async function stop(_previous: ActionState, form: FormData): Promise<ActionState> {
  const person = await requireOperator();
  const id = String(form.get("runId"));
  const reason = `${person.name} stopped it. Nothing was sent.`;
  if (!(await moveRun(id, STOPPABLE, "stopped", { decidedBy: person.name, reason })))
    return { error: "This run cannot be stopped now: it has finished or is sending." };
  revalidatePath(`/runs/${id}`);
  return {};
}

// The agent stops, and the person sends the request on the portal by hand, with the agent's form to copy from.
export async function takeOver(_previous: ActionState, form: FormData): Promise<ActionState> {
  const person = await requireOperator();
  const id = String(form.get("runId"));
  const reason = `${person.name} took it over to send by hand.`;
  if (!(await moveRun(id, STOPPABLE, "taken_over", { decidedBy: person.name, reason })))
    return { error: "This run cannot be taken over now: it has finished or is sending." };
  revalidatePath(`/runs/${id}`);
  return {};
}
