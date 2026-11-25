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
import { MarkdownText, ToolCard } from "@bootcamp/ui/parts";
import { BillingCard, HandOffCard, PlanCard, SourcesCard } from "./cards";

// Questions a visitor might ask. Each one shows a different action of the assistant.
const SUGGESTIONS = [
  "How much is Pro, and what does it add?",
  "Which workshop should I take first?",
  "I bought Pro yesterday by mistake. Can I get a refund?",
];

function UserMessage() {
  return (
    <MessagePrimitive.Root className="message-user">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

// A refused request (too many questions, or the daily spend cap) shows the server's plain sentence.
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="message-assistant">
      <MessagePrimitive.Parts
        components={{
          Text: MarkdownText,
          tools: {
            by_name: {
              search_site: SourcesCard,
              my_plan: PlanCard,
              billing_portal: BillingCard,
              hand_off: HandOffCard,
            },
            Fallback: ToolCard,
          },
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
              <h1>Ask about learnwithparam</h1>
              <p>Answers come from the pages of learnwithparam.com, with a link for every fact.</p>
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
        <ComposerPrimitive.Input
          className="composer-input"
          placeholder="Ask about labs, workshops, Pro or billing"
        />
        <ComposerPrimitive.Send className="button button-primary">Send</ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

export function Chat() {
  const runtime = useChatRuntime({ transport: new AssistantChatTransport({ api: "/api/chat" }) });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
