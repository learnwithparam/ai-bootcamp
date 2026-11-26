"use server";

import { revalidatePath } from "next/cache";
import { revokeApp } from "../../db/apps";
import { requireUser } from "../session";

// Revoke one app for the signed-in account. The account comes from the session, never from the form,
// so nobody can revoke an app for someone else.
export async function revoke(clientId: string): Promise<{ error?: string }> {
  const user = await requireUser("/apps");
  if (!(await revokeApp(user.id, clientId))) return { error: "That app was already disconnected." };
  revalidatePath("/apps");
  return {};
}
