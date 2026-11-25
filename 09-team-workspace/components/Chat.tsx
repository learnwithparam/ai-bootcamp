"use client";

import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { MarkdownText } from "@bootcamp/ui/parts";
import { lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConnectorCard, ForgetCard, RememberCard } from "./cards";

const SUGGESTIONS = [
  "I lead the data team and I prefer short answers",
  "Which courses are about agents?",
  "What do you remember about me?",
];

function UserMessage() {
  return (
    <MessagePrimitive.Root className="message-user">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="message-assistant">
      <MessagePrimitive.Parts
        components={{
          Text: MarkdownText,
          tools: { by_name: { remember: RememberCard, forget: ForgetCard }, Fallback: ConnectorCard },
        }}
      />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="card card-body chat-error" role="alert">
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}

function Thread() {
  return (
    <ThreadPrimitive.Root className="thread">
      <ThreadPrimitive.Viewport className="viewport">
        <div className="column">
          <AuiIf condition={(state) => state.thread.isEmpty}>
            <div className="empty">
              <h1>Ask your team's assistant</h1>
              <p>It remembers what you tell it across chats, and uses the services you connected.</p>
              <div className="suggestions">
                {SUGGESTIONS.map((prompt) => (
                  <ThreadPrimitive.Suggestion key={prompt} prompt={prompt} send asChild>
                    <button type="button" className="suggestion">
                      {prompt}
                    </button>
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            </div>
          </AuiIf>
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        </div>
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root className="composer">
        <ComposerPrimitive.Input className="composer-input" placeholder="Message the assistant" />
        <ComposerPrimitive.Send className="button button-primary">Send</ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

// The browser sends only the chat id and its newest message. The server keeps the history.
// A new chat gets its id here, each time the page opens: Next may reuse a page it rendered before,
// and a reused id would add the message to the last chat. It moves to its own address once its first reply is saved.
export function Chat({ savedId, initial }: { savedId?: string; initial: UIMessage[] }) {
  const router = useRouter();
  const [chatId] = useState(() => savedId ?? crypto.randomUUID());
  const isNew = !savedId;
  const runtime = useChatRuntime({
    id: chatId,
    messages: initial,
    transport: new AssistantChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({ body: { chatId, message: messages.at(-1) } }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: () => {
      if (isNew) router.replace(`/chat/${chatId}`);
      else router.refresh();
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
