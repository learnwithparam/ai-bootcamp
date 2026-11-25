"use client";

import { useState, useTransition } from "react";
import { type Draft, EMPTY_DRAFT, type FieldName } from "../rules/collect";
import type { Turn } from "../rules/intake";
import { Conversation } from "./Conversation";
import { RequestPanel } from "./RequestPanel";

type TalkResult = {
  conversationId: string;
  transcript: Turn[];
  draft: Draft;
  filled: FieldName[];
  error?: string;
};
type Talk = (input: {
  conversationId: string | null;
  message: string;
  draft: Draft;
  edited: FieldName[];
}) => Promise<TalkResult>;
type Send = (input: { conversationId: string; draft: Draft }) => Promise<{ error?: string }>;

export type FormState = { draft: Draft; edited: FieldName[]; byAgent: FieldName[] };

// The agent's answer marks the fields it filled, except any the client already changed.
const filledByAgent = (before: FormState, answer: TalkResult): FormState => ({
  draft: answer.draft,
  edited: before.edited,
  byAgent: [...new Set([...before.byAgent, ...answer.filled])].filter(
    (name) => !before.edited.includes(name),
  ),
});

// A field the client changes becomes theirs for good.
function editedByClient(before: FormState, change: Partial<Draft>): FormState {
  const names = Object.keys(change) as FieldName[];
  return {
    draft: { ...before.draft, ...change },
    edited: [...new Set([...before.edited, ...names])],
    byAgent: before.byAgent.filter((name) => !names.includes(name)),
  };
}

// The client's side of intake: they talk on the left, and the form on the right fills in as they go.
// The agent's fields are marked. Anything the client changes is theirs, and the agent never writes over it.
export function IntakeDesk({ opening, talk, send }: { opening: Turn; talk: Talk; send: Send }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([opening]);
  const [form, setForm] = useState<FormState>({ draft: EMPTY_DRAFT, edited: [], byAgent: [] });
  const [error, setError] = useState<string>();
  const [waiting, startWaiting] = useTransition();

  function say(message: string) {
    setTranscript((before) => [...before, { from: "client", text: message }]);
    setError(undefined);
    startWaiting(async () => {
      const answer = await talk({ conversationId, message, draft: form.draft, edited: form.edited });
      setConversationId(answer.conversationId);
      setTranscript(answer.transcript);
      setError(answer.error);
      setForm((before) => filledByAgent(before, answer));
    });
  }

  function edit(change: Partial<Draft>) {
    setForm((before) => editedByClient(before, change));
  }

  async function submit() {
    if (!conversationId) return setError("Tell us what happened first.");
    const result = await send({ conversationId, draft: form.draft });
    if (result?.error) setError(result.error);
  }

  return (
    <div className="intake-desk">
      <Conversation transcript={transcript} waiting={waiting} error={error} onSay={say} />
      <RequestPanel form={form} onEdit={edit} onSend={submit} canSend={Boolean(conversationId) && !waiting} />
    </div>
  );
}
