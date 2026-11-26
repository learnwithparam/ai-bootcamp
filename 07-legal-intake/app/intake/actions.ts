"use server";

import { required } from "@bootcamp/model";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { startIntake } from "../../agent/agent";
import { collect, OPENING } from "../../agent/collect";
import {
  markSent,
  openConversation,
  saveTurn,
  startConversation,
  turnsToday,
  visitorHash,
} from "../../db/conversations";
import { takeRequest } from "../../db/queries";
import {
  type Draft,
  type FieldName,
  readDraft,
  readTurnsPerVisitor,
  tidyDraft,
  tidyEdited,
  whyNotTalk,
} from "../../rules/collect";
import { whyNotTake } from "../../rules/form";
import type { Turn } from "../../rules/intake";

// The public intake page. No account: the conversation lives on the server under a random id,
// and the client sends the form when they are happy with it.

export type TalkResult = {
  conversationId: string;
  transcript: Turn[];
  draft: Draft;
  filled: FieldName[];
  error?: string;
};

// The visitor's address comes only from the one header your proxy sets, named in LEGAL_INTAKE_IP_HEADER.
// X-Forwarded-For is never read: a visitor can type it and get a fresh daily limit with every message.
async function visitor() {
  const address = (await headers()).get(required("LEGAL_INTAKE_IP_HEADER"))?.trim();
  return visitorHash(address || "unknown");
}

export async function talk(input: {
  conversationId: string | null;
  message: string;
  draft: unknown;
  edited: unknown;
}): Promise<TalkResult> {
  const who = await visitor();
  const conversation =
    (input.conversationId ? await openConversation(input.conversationId) : null) ??
    (await startConversation(who, OPENING));
  const draft = tidyDraft(input.draft);
  const counts = await turnsToday(who);
  const refused = whyNotTalk(input.message, conversation.transcript, {
    visitorToday: counts.visitor,
    today: counts.everyone,
    perVisitor: readTurnsPerVisitor(process.env),
  });
  const base = { conversationId: conversation.id, transcript: conversation.transcript, draft, filled: [] };
  if (refused) return { ...base, error: refused };
  const asked: Turn[] = [...conversation.transcript, { from: "client", text: input.message.trim() }];
  try {
    const answer = await collect(asked, draft, tidyEdited(input.edited));
    const transcript: Turn[] = [...asked, { from: "agent", text: answer.reply }];
    await saveTurn(conversation.id, transcript, answer.draft, answer.cost);
    return { ...base, transcript, draft: answer.draft, filled: answer.filled };
  } catch (error) {
    console.error(`Intake conversation ${conversation.id}: the model did not answer:`, error);
    return {
      ...base,
      error: "Our assistant did not answer. Send your message again, or fill in the form yourself.",
    };
  }
}

export async function sendIntake(input: {
  conversationId: string;
  draft: unknown;
}): Promise<{ error?: string }> {
  const conversation = await openConversation(input.conversationId);
  if (!conversation) return { error: "This conversation was already sent, or it has expired. Start again." };
  const { request, error } = readDraft(tidyDraft(input.draft), conversation.transcript);
  if (!request) return { error };
  const taken = await takeRequest(request, whyNotTake);
  if ("refused" in taken) return { error: taken.refused };
  await markSent(conversation.id, taken.id);
  after(() => startIntake(taken.id, request));
  redirect(`/requests/${taken.token}`);
}
