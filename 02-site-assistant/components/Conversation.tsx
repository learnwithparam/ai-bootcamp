"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Thread } from "./Thread";

export type Owner = { owner: "assistant" | "team"; ownerName: string; assigned: boolean };
export type Opened = Owner & { id: string; messages: UIMessage[] };

const POLL_MS = 4_000;

// The browser sends only its newest message; Postgres keeps the rest.
function chatTransport(id: string) {
  return new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ messages }) => ({
      body: { conversationId: id, message: messages.at(-1), page: window.location.pathname },
    }),
  });
}

// The poll skips while a reply streams in. Right after a reply it must not: the status has not
// caught up yet, and that reply may have just passed the conversation to the team.
function useRefresh(
  id: string,
  setMessages: (messages: UIMessage[]) => void,
  busy: { current: boolean },
  setOwner: (owner: Owner) => void,
) {
  return useCallback(
    async (afterReply = false) => {
      const response = await fetch(`/api/conversation?id=${id}`, {
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null);
      if (!response?.ok || (busy.current && !afterReply)) return;
      const { conversation, messages } = await response.json();
      setOwner({
        owner: conversation.owner,
        ownerName: conversation.ownerName,
        assigned: conversation.assigned,
      });
      setMessages(messages);
    },
    [id, setMessages, busy, setOwner],
  );
}

// One conversation in the messenger.
// While a person on the team has it, the panel asks for new messages every few seconds, so their reply shows here.
export function Conversation(props: { start: Opened; onNew: () => void; onClose: () => void }) {
  const { start } = props;
  const [owner, setOwner] = useState<Owner>({
    owner: start.owner,
    ownerName: start.ownerName,
    assigned: start.assigned,
  });
  const transport = useMemo(() => chatTransport(start.id), [start.id]);
  const refreshRef = useRef<(afterReply?: boolean) => Promise<void>>(async () => {});
  const chat = useChat({
    id: start.id,
    messages: start.messages,
    transport,
    onFinish: () => refreshRef.current(true),
  });
  const busy = useRef(false);
  busy.current = chat.status === "submitted" || chat.status === "streaming";

  const refresh = useRefresh(start.id, chat.setMessages, busy, setOwner);
  refreshRef.current = refresh;

  useEffect(() => {
    if (owner.owner !== "team") return;
    const timer = setInterval(() => refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [owner.owner, refresh]);

  // A teammate's reply is its own message after the assistant's, so the two are never joined into one bubble.
  const runtime = useAISDKRuntime(chat, { joinStrategy: "none" });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread owner={owner} onNew={props.onNew} onClose={props.onClose} />
    </AssistantRuntimeProvider>
  );
}
