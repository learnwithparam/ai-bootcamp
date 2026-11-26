"use client";

import { AuiIf, ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { ArrowUp, Sparkles, SquarePen, Users, X } from "lucide-react";
import type { Owner } from "./Conversation";
import { initials } from "./initials";
import { AssistantMessage, UserMessage } from "./Messages";

// Questions a visitor might ask. Each one shows a different action of the assistant.
const SUGGESTIONS = [
  "How much is Pro, and what does it add?",
  "Which course should I take first?",
  "I bought Pro by mistake. Can I get a refund?",
];

// The top of the panel always says who is answering: the assistant, or a named person on the team.
function Header({ owner, onNew, onClose }: { owner: Owner; onNew: () => void; onClose: () => void }) {
  const person = owner.owner === "team";
  return (
    <header className="messenger-head">
      <span className={person ? "owner-mark owner-person" : "owner-mark"} aria-hidden="true">
        {person ? owner.assigned ? initials(owner.ownerName) : <Users /> : <Sparkles />}
      </span>
      <span className="messenger-owner">
        <strong>{owner.ownerName}</strong>
        <span>{person ? "Replies in this conversation" : "Answers from learnwithparam.com"}</span>
      </span>
      <button type="button" className="icon-button" aria-label="Start a new conversation" onClick={onNew}>
        <SquarePen aria-hidden="true" />
      </button>
      <button type="button" className="icon-button" aria-label="Close the messenger" onClick={onClose}>
        <X aria-hidden="true" />
      </button>
    </header>
  );
}

function Welcome() {
  return (
    <AuiIf condition={(state) => state.thread.isEmpty}>
      <div className="messenger-welcome">
        <h2>Hi, what can we help with?</h2>
        <p>Ask about courses, live labs, Pro or your billing. Every answer links to the page it came from.</p>
        <div className="reply-options">
          {SUGGESTIONS.map((prompt) => (
            <ThreadPrimitive.Suggestion key={prompt} prompt={prompt} send asChild>
              <button type="button" className="reply-option">
                {prompt}
              </button>
            </ThreadPrimitive.Suggestion>
          ))}
        </div>
      </div>
    </AuiIf>
  );
}

export function Thread(props: { owner: Owner; onNew: () => void; onClose: () => void }) {
  const person = props.owner.owner === "team";
  return (
    <ThreadPrimitive.Root className="messenger-thread">
      <Header {...props} />
      <ThreadPrimitive.Viewport className="messenger-viewport">
        <Welcome />
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root className="messenger-composer">
        <ComposerPrimitive.Input
          className="messenger-input"
          placeholder={person ? "Write a reply" : "Ask a question"}
          aria-label="Your message"
          rows={1}
        />
        <ComposerPrimitive.Send className="send-button" aria-label="Send">
          <ArrowUp aria-hidden="true" />
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}
