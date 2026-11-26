"use client";

import { Markdown } from "@bootcamp/ui/markdown";
import { LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { inputWords } from "../rules/plain";

type Answer = { text: string; calls: { tool: string; input: Record<string, unknown> }[] };
type Titles = Record<string, string>;

function AnswerView({ answer, titles }: { answer: Answer; titles: Titles }) {
  return (
    <div className="ask-answer">
      {answer.calls.length ? (
        <ol className="ask-calls" aria-label="Tools it called">
          {answer.calls.map((call, index) => (
            <li key={String(index)}>
              <span className="pill pill-agent">{titles[call.tool] ?? call.tool}</span>
              <span className="cell-sub">{inputWords(call.input)}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <Markdown text={answer.text} />
    </div>
  );
}

function AskForm({ onAnswer }: { onAnswer: (answer: Answer | null, error: string | null) => void }) {
  const [asking, setAsking] = useState(false);
  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = String(new FormData(event.currentTarget).get("question") ?? "");
    setAsking(true);
    const response = await fetch("/api/ask", { method: "POST", body: JSON.stringify({ question }) });
    const body = (await response.json()) as Answer & { error?: string };
    onAnswer(response.ok ? body : null, response.ok ? null : (body.error ?? "No answer just now."));
    setAsking(false);
  }
  return (
    <form onSubmit={ask} className="ask-form">
      <label htmlFor="question" className="sr-only">
        Question
      </label>
      <input
        id="question"
        name="question"
        className="field"
        maxLength={500}
        required
        placeholder="What live labs are coming up in December?"
      />
      <button type="submit" className="button" disabled={asking}>
        {asking ? "Asking" : "Ask"}
      </button>
    </form>
  );
}

// Ask in plain words: the model picks the tools, and the page shows each call it made, so nothing is hidden.
export function AskPanel({ signedIn, titles }: { signedIn: boolean; titles: Titles }) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="panel ask-panel" aria-labelledby="ask-title">
      <h2 className="panel-head" id="ask-title">
        <Sparkles aria-hidden="true" /> Ask in plain words
      </h2>
      <div className="panel-body">
        {signedIn ? (
          <AskForm
            onAnswer={(next, problem) => {
              setAnswer(next);
              setError(problem);
            }}
          />
        ) : (
          <Link href="/sign-in?next=/" className="button">
            <LogIn aria-hidden="true" /> Sign in to ask
          </Link>
        )}
        {error ? (
          <p className="result-error" role="alert">
            {error}
          </p>
        ) : null}
        {answer ? <AnswerView answer={answer} titles={titles} /> : null}
      </div>
    </section>
  );
}
