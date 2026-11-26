"use server";

import { revalidatePath } from "next/cache";
import { approveDiscountDraft } from "../../../db/approve";
import { discardDraft } from "../../../db/discounts";
import { recordChange } from "../../../db/queries";
import { requireOwner } from "../../session";

// Both actions check the role on the server, so a staff member who posts the form by hand is refused.
export async function approveDiscount(form: FormData) {
  const owner = await requireOwner();
  await approveDiscountDraft(Number(form.get("id")), owner.id);
  revalidatePath("/", "layout");
}

export async function discardDiscount(form: FormData) {
  const owner = await requireOwner();
  const id = Number(form.get("id"));
  if (await discardDraft(id, owner.id)) {
    await recordChange({
      userId: owner.id,
      by: "person",
      action: "Discarded a discount draft",
      detail: { draftId: id },
    });
  }
  revalidatePath("/", "layout");
}
