"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MESSAGE_MAX } from "../rules/collect";
import { numbered, type Turn } from "../rules/intake";

function Message({ turn }: { turn: Turn }) {
  return (
    <li className={`turn turn-${turn.from}`}>
      <span className="turn-who">{turn.from === "agent" ? "Harlow Legal" : "You"}</span>
      <p>{turn.text}</p>
    </li>
  );
}

function Composer({ waiting, onSay }: { waiting: boolean; onSay: (message: string) => void }) {
  const [message, setMessage] = useState("");
  const submit = () => {
    if (!message.trim() || waiting) return;
    onSay(message.trim());
    setMessage("");
  };
  return (
    <form className="composer" action={submit}>
      <label className="sr-only" htmlFor="message">
        Your message
      </label>
      <textarea
        id="message"
        className="field"
        rows={3}
        maxLength={MESSAGE_MAX}
        placeholder="Write what happened, in your own words"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          submit();
        }}
      />
      <button type="submit" className="button button-primary" disabled={waiting || !message.trim()}>
        <ArrowUp aria-hidden="true" /> Send
      </button>
    </form>
  );
}

// The conversation half of the intake page. One message at a time; the page waits for each answer.
export function Conversation(props: {
  transcript: Turn[];
  waiting: boolean;
  error?: string;
  onSay: (message: string) => void;
}) {
  const { transcript, waiting, error, onSay } = props;
  const end = useRef<HTMLLIElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to the newest message whenever one arrives.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [transcript.length, waiting]);
  return (
    <section className="conversation" aria-label="Conversation">
      {/* A scrolling list must take keyboard focus, or a keyboard user cannot scroll back through it. */}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: axe scrollable-region-focusable needs it */}
      <ol className="turns" tabIndex={0} aria-label="Conversation">
        {numbered(transcript).map((turn) => (
          <Message key={turn.place} turn={turn} />
        ))}
        {waiting ? <li className="turn turn-agent turn-typing">Reading what you wrote...</li> : null}
        <li ref={end} aria-hidden="true" />
      </ol>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Composer waiting={waiting} onSay={onSay} />
    </section>
  );
}
