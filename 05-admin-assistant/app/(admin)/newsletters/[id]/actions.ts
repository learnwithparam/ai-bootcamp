"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { approveNewsletter, saveNewsletter, settleRevision } from "../../../../db/newsletters";
import { recordChange } from "../../../../db/queries";
import { requireOwner, requireTeam } from "../../../session";

const refresh = () => revalidatePath("/", "layout");

// Owners and staff can edit a draft and settle the assistant's change. Only an owner approves.
export async function saveIssue(form: FormData) {
  const member = await requireTeam();
  const id = Number(form.get("id"));
  await saveNewsletter(id, String(form.get("subject") ?? ""), String(form.get("body") ?? ""));
  await recordChange({
    userId: member.id,
    by: "person",
    action: "Edited a newsletter draft",
    detail: { newsletterId: id },
  });
  refresh();
}

export async function keepChange(form: FormData) {
  await requireTeam();
  await settleRevision(Number(form.get("id")), true);
  refresh();
}

export async function undoChange(form: FormData) {
  const member = await requireTeam();
  const id = Number(form.get("id"));
  await settleRevision(id, false);
  await recordChange({
    userId: member.id,
    by: "person",
    action: "Undid the assistant's edit",
    detail: { newsletterId: id },
  });
  refresh();
}

export async function approveIssue(form: FormData) {
  const owner = await requireOwner();
  const id = Number(form.get("id"));
  const problem = await approveNewsletter(id, owner.id, String(form.get("version") ?? ""));
  if (problem) redirect(`/newsletters/${id}?problem=${problem}`);
  await recordChange({
    userId: owner.id,
    by: "person",
    action: "Approved a newsletter",
    detail: { newsletterId: id },
  });
  refresh();
}
