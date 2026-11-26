"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { assign, close, reply } from "../../db/inbox";
import { teammateReply } from "../../rules/conversation";
import { requireSupport } from "../session";

// On an error the draft comes back, because React clears the form after every action.
export type ReplyState = { error: string | null; draft: string; sent: number };

const idOf = (form: FormData) => String(form.get("conversation") ?? "");

// Every action checks the permission again. A hidden button is not a permission check.
export async function sendReply(state: ReplyState, form: FormData): Promise<ReplyState> {
  const user = await requireSupport();
  const draft = String(form.get("reply") ?? "");
  const message = teammateReply(randomUUID(), user.name, draft);
  if (typeof message === "string") return { error: message, draft, sent: state.sent };
  await reply(idOf(form), { id: user.id, name: user.name }, message);
  revalidatePath("/inbox");
  return { error: null, draft: "", sent: state.sent + 1 };
}

export async function assignToMe(form: FormData): Promise<void> {
  const user = await requireSupport();
  await assign(idOf(form), { id: user.id, name: user.name });
  revalidatePath("/inbox");
}

export async function closeConversation(form: FormData): Promise<void> {
  await requireSupport();
  await close(idOf(form));
  revalidatePath("/inbox");
}
