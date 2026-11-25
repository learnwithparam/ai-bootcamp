"use server";

import { revalidatePath } from "next/cache";
import { markAnswered } from "../../db/queries";
import { requireSupport } from "../session";

// The permission is checked again here. A hidden button is not a permission check.
export async function answerTicket(form: FormData): Promise<void> {
  const user = await requireSupport();
  const id = Number(form.get("ticket"));
  if (!Number.isInteger(id)) throw new Error("The ticket number is missing.");
  await markAnswered(id, user.email);
  revalidatePath("/support");
}
