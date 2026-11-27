"use client";

import { AuiIf, ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { ArrowUp } from "lucide-react";
import { MAX_QUESTION_CHARS } from "../rules/limits";
import { AssistantMessage, UserMessage } from "./Messages";

// Each starter takes a different path through the graph.
const STARTERS = [
  { question: "How many orders were delivered?", path: "One figure" },
  { question: "What are the top 5 product categories by sales?", path: "A ranking, with a chart" },
  { question: "Show me orders from São Paulo", path: "Rows from two joined tables" },
  { question: "What's the average review score?", path: "An average" },
  { question: "Which sellers have the most orders?", path: "Sellers ranked by orders" },
];

function Welcome() {
  return (
    <AuiIf condition={(state) => state.thread.isEmpty}>
      <div className="welcome">
        <h1>Ask your marketplace records</h1>
        <p>
          An agent reads the schema, writes the SQL and runs it. The rows come to your screen and are never
          sent to a model. The orders run from September 2016 to October 2018.
        </p>
        <ul className="starters">
          {STARTERS.map(({ question, path }) => (
            <li key={question}>
              <ThreadPrimitive.Suggestion prompt={question} send asChild>
                <button type="button" className="starter">
                  <strong>{question}</strong>
                  <span>{path}</span>
                </button>
              </ThreadPrimitive.Suggestion>
            </li>
          ))}
        </ul>
      </div>
    </AuiIf>
  );
}

export function Thread() {
  return (
    <ThreadPrimitive.Root className="analyst-thread">
      <ThreadPrimitive.Viewport className="analyst-viewport">
        <AuiIf condition={(state) => !state.thread.isEmpty}>
          <h1 className="sr-only">Your questions and their answers</h1>
        </AuiIf>
        <Welcome />
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root className="composer">
        <ComposerPrimitive.Input
          className="composer-input"
          placeholder="Ask about orders, payments, sellers or review scores"
          aria-label="Your question"
          maxLength={MAX_QUESTION_CHARS}
          rows={1}
        />
        <ComposerPrimitive.Send className="button button-primary" aria-label="Ask">
          <ArrowUp aria-hidden="true" />
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}
