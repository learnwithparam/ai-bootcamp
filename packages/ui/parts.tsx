"use client";

import type { ReasoningMessagePartComponent, ToolCallMessagePartComponent } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";

// Pieces every chat in this repo shares: text, thinking and a plain tool card.
// A product draws its own card for each of its tools and falls back to ToolCard.

export function MarkdownText() {
  return <MarkdownTextPrimitive className="markdown" />;
}

export function StatusChip({ running }: { running: boolean }) {
  if (running) return <span className="status status-wait">running</span>;
  return <span className="status status-pass">done</span>;
}

export const Thinking: ReasoningMessagePartComponent = ({ text, status }) => (
  <details className="card thinking">
    <summary className="card-head">
      <span className="label">Thinking</span>
      {status.type === "running" ? <span className="running">thinking...</span> : <span>show</span>}
    </summary>
    <div className="card-body">{text}</div>
  </details>
);

export const ToolCard: ToolCallMessagePartComponent = ({ toolName, status }) => (
  <div className="card">
    <div className="card-head">
      <span className="label">{toolName}</span>
      <StatusChip running={status.type === "running"} />
    </div>
  </div>
);
