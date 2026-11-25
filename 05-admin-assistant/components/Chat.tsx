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
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { CouponCard } from "./CouponCard";
import { AccountsCard, CodesCard, DraftCard, SignupsCard, SkillCard } from "./cards";

// One question per skill.
const SUGGESTIONS = [
  "How many people signed up in the last 30 days?",
  "Make a 20% code for Black Friday, for the first payment",
  "Draft this week's newsletter",
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
          tools: {
            by_name: {
              load_skill: SkillCard,
              signups_by_day: SignupsCard,
              recent_accounts: AccountsCard,
              list_coupons: CodesCard,
              create_coupon: CouponCard,
              save_newsletter_draft: DraftCard,
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
              <h1>Run the school from here</h1>
              <p>
                Ask about signups, make a discount code, or draft the newsletter. Every change waits for you.
              </p>
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
          placeholder="Ask about signups, codes or the newsletter"
        />
        <ComposerPrimitive.Send className="button button-primary">Send</ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

// After the owner answers an approval card, the chat sends the answer back by itself and the assistant carries on.
export function Chat() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
