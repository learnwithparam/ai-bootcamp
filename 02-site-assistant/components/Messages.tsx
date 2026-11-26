"use client";

import { ErrorPrimitive, MessagePrimitive, useAuiState } from "@assistant-ui/react";
import { MarkdownText, ToolCard } from "@bootcamp/ui/parts";
import { Sparkles } from "lucide-react";
import { BillingCard, HandOffCard, PlanCard, SourcesCard } from "./cards";
import { initials } from "./initials";

export function UserMessage() {
  return (
    <MessagePrimitive.Root className="bubble-row bubble-row-user">
      <div className="bubble bubble-user">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

// Every reply says who wrote it. A teammate's reply is saved with their name; the rest are the assistant's.
function Author() {
  const name = useAuiState((state) => {
    const custom = state.message.metadata.custom as { author?: string; name?: string };
    return custom.author === "teammate" ? (custom.name ?? "The support team") : null;
  });
  return (
    <p className="bubble-author">
      <span className={name ? "owner-mark owner-person small" : "owner-mark small"} aria-hidden="true">
        {name ? initials(name) : <Sparkles />}
      </span>
      {name ?? "The assistant"}
      {name ? <span className="author-role">Support team</span> : null}
    </p>
  );
}

// A refused request (too many questions, or the daily spend cap) shows the server's plain sentence.
export function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="bubble-row">
      <Author />
      <div className="bubble bubble-reply">
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
          <ErrorPrimitive.Root className="chat-error" role="alert">
            <ErrorPrimitive.Message />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}
