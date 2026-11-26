"use client";

import { useState } from "react";
import { LONGEST_ASK } from "../rules/state";

const EXAMPLES = [
  "Vegan, cooking for two, under £40 a week",
  "No nuts please, my son is allergic. Fill my basket for the week",
  "Soy vegetariana y no tomo leche",
];

// Ready sentences a shopper can try, one of them in Spanish, since the shop answers in the shopper's language.
function Examples({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="ask-examples">
      {EXAMPLES.map((example) => (
        <button key={example} type="button" className="example" onClick={() => onPick(example)}>
          {example}
        </button>
      ))}
    </div>
  );
}

// The one place the shopper talks to the shop. The answer is the page itself, not a chat reply.
export function AskBox({ running, onAsk }: { running: boolean; onAsk: (text: string) => void }) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim() || running) return;
    onAsk(text.trim());
    setText("");
  };
  return (
    <form
      className="ask"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <label htmlFor="ask">Tell us how you shop</label>
      <textarea
        id="ask"
        className="field"
        rows={3}
        maxLength={LONGEST_ASK}
        value={text}
        placeholder="Diet, allergies, budget, how many you cook for"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
      />
      <Examples onPick={setText} />
      <button type="submit" className="button" disabled={running || !text.trim()}>
        {running ? "Changing your page" : "Change my page"}
      </button>
    </form>
  );
}
