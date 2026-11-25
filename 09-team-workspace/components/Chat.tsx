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
import { ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConnectorCard, ForgetCard, RememberCard } from "./cards";

const SUGGESTIONS = [
  { title: "Tell it about you", prompt: "I lead the data team and I prefer short answers" },
  { title: "Find a course", prompt: "Which learnwithparam courses are about agents?" },
  { title: "Check its memory", prompt: "What do you remember about me?" },
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

function Empty({ firstName }: { firstName: string }) {
  return (
    <AuiIf condition={(state) => state.thread.isEmpty}>
      <div className="empty">
        <h1>What can I help with, {firstName}?</h1>
        <p>It remembers what you tell it across chats, and uses the services you connect.</p>
        <div className="suggestions">
          {SUGGESTIONS.map((each) => (
            <ThreadPrimitive.Suggestion key={each.prompt} prompt={each.prompt} send asChild>
              <button type="button" className="suggestion">
                <strong>{each.title}</strong>
                <span>{each.prompt}</span>
              </button>
            </ThreadPrimitive.Suggestion>
          ))}
        </div>
      </div>
    </AuiIf>
  );
}

function Composer() {
  return (
    <div className="composer-dock">
      <ComposerPrimitive.Root className="composer">
        <ComposerPrimitive.Input
          className="composer-input"
          placeholder="Message the assistant"
          aria-label="Message the assistant"
          rows={1}
        />
        <ComposerPrimitive.Send className="send-button" aria-label="Send">
          <ArrowUp aria-hidden="true" />
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
      <p className="composer-note">It can be wrong. A tool that changes something asks you first.</p>
    </div>
  );
}

function Thread({ firstName }: { firstName: string }) {
  return (
    <ThreadPrimitive.Root className="thread">
      <ThreadPrimitive.Viewport className="viewport">
        <div className="column">
          <Empty firstName={firstName} />
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        </div>
      </ThreadPrimitive.Viewport>
      <Composer />
    </ThreadPrimitive.Root>
  );
}

// The browser sends only the chat id and its newest message. The server keeps the history.
// A new chat gets its id here, each time the page opens: Next may reuse a page it rendered before,
// and a reused id would add the message to the last chat. It moves to its own address once its first reply is saved.
export function Chat(props: { savedId?: string; initial: UIMessage[]; firstName: string }) {
  const { savedId, initial } = props;
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
      <Thread firstName={props.firstName} />
    </AssistantRuntimeProvider>
  );
}
