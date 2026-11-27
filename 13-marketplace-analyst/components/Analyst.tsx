"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { AnalystMessage } from "../agent/converse";
import { Thread } from "./Thread";

// The browser sends only its newest message; Postgres keeps the rest.
export function Analyst({ id, start }: { id: string; start: AnalystMessage[] }) {
  const router = useRouter();
  const transport = useMemo(
    () =>
      new DefaultChatTransport<AnalystMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { conversationId: id, message: messages.at(-1) },
        }),
      }),
    [id],
  );
  // After a first answer the new chat appears in the list, and the address points at it.
  const chat = useChat<AnalystMessage>({
    id,
    messages: start,
    transport,
    onFinish: () => router.replace(`/?c=${id}`, { scroll: false }),
  });
  const runtime = useAISDKRuntime(chat);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
