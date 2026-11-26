"use server";

import { revalidatePath } from "next/cache";
import { cancelById } from "../../db/diary";
import { markMessageDone } from "../../db/queries";
import { requireTeam } from "../session";

// The front desk's two actions. Each checks the team on the server, so a form posted by hand is refused too.
const ID = /^[0-9a-f-]{36}$/;

export async function cancelAppointment(id: string) {
  await requireTeam();
  if (!ID.test(id)) throw new Error("Not an appointment.");
  await cancelById(id);
  revalidatePath("/desk", "layout");
}

export async function messageDone(id: string) {
  await requireTeam();
  if (!ID.test(id)) throw new Error("Not a message.");
  await markMessageDone(id);
  revalidatePath("/desk", "layout");
}
