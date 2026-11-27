"use client";

import type { ReasoningMessagePartComponent, ToolCallMessagePartComponent } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";

// Pieces every chat in this repo shares: text, thinking and a plain tool card.
// A product draws its own card for each of its tools and falls back to ToolCard.

// A reply never loads an image. Loading one sends a request to its address, so a reply steered by
// a hostile page or name could carry private data out in that address. The alt text is shown instead.
function NoImage({ alt }: { alt?: string }) {
  return alt ? <span>{alt}</span> : null;
}

// A product that rewrites the text first, for example to turn citation markers into links, uses this.
export function RewrittenText({ preprocess }: { preprocess?: (text: string) => string }) {
  return (
    <MarkdownTextPrimitive
      className="markdown"
      preprocess={preprocess}
      remarkPlugins={[remarkGfm]}
      components={{ img: NoImage }}
    />
  );
}

export function MarkdownText() {
  return <RewrittenText />;
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

// A tool's name is for the model. A person reads a label: "learnwithparam__search_catalog" becomes
// "Search catalog", and the server name before "__" is shown as where the tool came from.
export function toolLabel(toolName: string): { label: string; source?: string } {
  const [first, ...rest] = toolName.split("__");
  const name = rest.length ? rest.join(" ") : (first ?? toolName);
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  return rest.length ? { label, source: first } : { label };
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export const ToolCard: ToolCallMessagePartComponent = ({ toolName, args, result, status }) => {
  const { label, source } = toolLabel(toolName);
  return (
    <details className="card tool-card">
      <summary className="card-head">
        <span className="label">{label}</span>
        {source ? <span className="tool-source">from {source}</span> : null}
        <StatusChip running={status.type === "running"} />
      </summary>
      <div className="card-body tool-detail">
        <span className="field-label">Asked with</span>
        <pre>{asText(args)}</pre>
        {result === undefined ? null : (
          <>
            <span className="field-label">Got back</span>
            <pre>{asText(result)}</pre>
          </>
        )}
      </div>
    </details>
  );
};
