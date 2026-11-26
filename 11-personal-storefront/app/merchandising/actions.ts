"use server";

import { revalidatePath } from "next/cache";
import { setTypeEnabled } from "../../db/queries";
import { SECTION_TYPES, type SectionType } from "../../rules/sections";
import { requireTeam } from "../session";

// Turning a kind of section on or off for every shopper. Checked on the server, so a form posted by hand is refused too.
export async function setSectionType(type: SectionType, enabled: boolean) {
  await requireTeam();
  if (!SECTION_TYPES.includes(type)) throw new Error("Not a kind of section the shop has.");
  await setTypeEnabled(type, enabled);
  revalidatePath("/merchandising");
}
