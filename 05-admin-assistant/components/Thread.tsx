"use client";

import {
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { MarkdownText, ToolCard } from "@bootcamp/ui/parts";
import { AccountsCard, CodesCard, SignupsCard, SkillCard } from "./cards";
import { CouponDraftCard, NewsletterEditCard, NewsletterSavedCard } from "./draft-cards";

// One question per skill, for an empty panel.
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

const TOOLS = {
  load_skill: SkillCard,
  signups_by_day: SignupsCard,
  recent_accounts: AccountsCard,
  list_coupons: CodesCard,
  draft_coupon: CouponDraftCard,
  save_newsletter_draft: NewsletterSavedCard,
  revise_newsletter: NewsletterEditCard,
};

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="message-assistant">
      <MessagePrimitive.Parts
        components={{ Text: MarkdownText, tools: { by_name: TOOLS, Fallback: ToolCard } }}
      />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="chat-error" role="alert">
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}

function Empty() {
  return (
    <div className="assistant-empty">
      <p>
        Ask about signups, propose a discount code, or write the newsletter. Codes and issues wait for an
        owner.
      </p>
      {SUGGESTIONS.map((prompt) => (
        <ThreadPrimitive.Suggestion key={prompt} prompt={prompt} send asChild>
          <button type="button" className="suggestion">
            {prompt}
          </button>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

export function Thread() {
  return (
    <ThreadPrimitive.Root className="assistant-thread">
      <ThreadPrimitive.Viewport className="assistant-viewport">
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <Empty />
        </AuiIf>
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root className="assistant-composer">
        <ComposerPrimitive.Input
          className="composer-input"
          placeholder="Ask the assistant"
          aria-label="Ask the assistant"
        />
        <ComposerPrimitive.Send className="button button-primary">Send</ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}
