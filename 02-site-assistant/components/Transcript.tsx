import { Markdown } from "@bootcamp/ui/markdown";
import { Sparkles } from "lucide-react";
import { type StoredMessage, textOf } from "../rules/conversation";
import { initials } from "./initials";

type Props = { messages: StoredMessage[]; visitor: string; summary: string | null };

function authorOf(message: StoredMessage, visitor: string): { name: string; person: boolean } {
  if (message.role === "user") return { name: visitor, person: true };
  if (message.metadata?.author === "teammate") return { name: message.metadata.name, person: true };
  return { name: "The assistant", person: false };
}

// The whole conversation as the visitor saw it, with the assistant's hand-off summary pinned at the top.
export function Transcript({ messages, visitor, summary }: Props) {
  return (
    <div className="transcript">
      {summary ? (
        <aside className="handoff-summary" aria-label="Hand-off summary">
          <p className="handoff-label">
            <Sparkles aria-hidden="true" /> Summary from the assistant
          </p>
          <p>{summary}</p>
        </aside>
      ) : null}
      <ol className="transcript-list">
        {messages.map((message) => {
          const author = authorOf(message, visitor);
          const text = textOf(message);
          if (!text) return null;
          return (
            <li key={message.id} className={`transcript-item transcript-${message.role}`}>
              <p className="transcript-author">
                <span
                  className={author.person ? "owner-mark owner-person small" : "owner-mark small"}
                  aria-hidden="true"
                >
                  {author.person ? initials(author.name) : <Sparkles />}
                </span>
                {author.name}
              </p>
              <div className="transcript-body">
                {message.role === "user" ? <p>{text}</p> : <Markdown text={text} />}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
