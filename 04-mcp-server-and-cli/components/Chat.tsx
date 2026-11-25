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

// Each one makes the model pick a different tool.
const SUGGESTIONS = ["What live labs are coming up?", "Find me something on RAG evals", "Show my saved list"];

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
      <MessagePrimitive.Parts components={{ Text: MarkdownText, tools: { Fallback: ToolCard } }} />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="card card-body" role="alert">
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}

export function Chat() {
  const runtime = useChatRuntime({ transport: new AssistantChatTransport({ api: "/api/chat" }) });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="thread">
        <ThreadPrimitive.Viewport className="viewport">
          <div className="column">
            <AuiIf condition={(state) => state.thread.isEmpty}>
              <div className="empty">
                <h1>Ask with the same tools</h1>
                <p>The chat uses the tools on the left. Each step shows which one it called.</p>
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
            placeholder="Ask about labs, courses and your list"
          />
          <ComposerPrimitive.Send className="button button-primary">Send</ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
