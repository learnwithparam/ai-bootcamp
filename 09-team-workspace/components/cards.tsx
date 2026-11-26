"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { toolLabel } from "@bootcamp/ui/parts";
import { Brain, Check, LoaderCircle, Plug, ShieldQuestion } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, useState } from "react";

type Respond = (answer: { approved: boolean; reason?: string }) => Promise<void>;

// The two buttons on a card that waits. A failed answer is shown on the card, and the buttons come back.
function Decide({ respond }: { respond: Respond }) {
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  async function answer(approved: boolean) {
    setSending(true);
    setFailure(null);
    try {
      await respond({ approved, ...(approved ? {} : { reason: "The person said no." }) });
    } catch (error) {
      console.error("The approval answer was not sent", error);
      setFailure("Your answer was not recorded. Try again.");
      setSending(false);
    }
  }
  return (
    <>
      <div className="approve-row">
        <button
          type="button"
          className="button button-primary"
          disabled={sending}
          onClick={() => answer(true)}
        >
          Approve
        </button>
        <button type="button" className="button" disabled={sending} onClick={() => answer(false)}>
          Do not do it
        </button>
      </div>
      {failure ? <p className="chat-error">{failure}</p> : null}
    </>
  );
}

const words = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
const shown = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));

// What the tool was asked with, as named fields a person can read, never as raw JSON.
function Inputs({ args }: { args: unknown }) {
  const entries = Object.entries((args ?? {}) as Record<string, unknown>);
  if (entries.length === 0) return <p className="muted">Nothing was sent.</p>;
  return (
    <dl className="tool-inputs">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{words(key)}</dt>
          <dd>{shown(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

// An MCP result is a list of text blocks. A person sees the text, cut short, with nothing parsed as markup.
function resultText(result: unknown): string {
  const content = (result as { content?: { type: string; text?: string }[] })?.content;
  const text = content ? content.map((block) => block.text ?? "").join("\n") : shown(result);
  return text.length > 600 ? `${text.slice(0, 600)}...` : text;
}

type CardProps = ComponentProps<ToolCallMessagePartComponent>;

function Approval({ toolName, args, result, status, approval, respondToApproval }: CardProps) {
  const { label, source } = toolLabel(toolName);
  return (
    <section className="tool-approval" aria-label={`${label} needs your approval`}>
      <p className="tool-approval-head">
        <ShieldQuestion aria-hidden="true" />
        <span>
          {source ?? "A connector"} wants to <strong>{label.toLowerCase()}</strong>
        </span>
        {approval?.approved === false ? <span className="status status-fail">you said no</span> : null}
        {approval?.approved && status.type === "running" ? (
          <LoaderCircle className="spin" aria-label="running" />
        ) : null}
      </p>
      <Inputs args={args} />
      {result !== undefined ? (
        <p className="tool-done">
          <Check aria-hidden="true" /> Done
        </p>
      ) : null}
      {approval?.approved === undefined ? <Decide respond={respondToApproval} /> : null}
    </section>
  );
}

// Every connector tool. A read runs on its own and shows as one quiet line; one that changes something waits.
// The first short text the model passed, so five searches in a row say what each one looked for.
function asked(args: unknown): string | undefined {
  const text = Object.values((args ?? {}) as Record<string, unknown>).find(
    (value) => typeof value === "string",
  );
  if (typeof text !== "string" || text.length === 0) return undefined;
  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}

export const ConnectorCard: ToolCallMessagePartComponent = (props) => {
  if (props.approval) return <Approval {...props} />;
  const { label, source } = toolLabel(props.toolName);
  const running = props.status.type === "running";
  return (
    <details className="tool-line">
      <summary>
        {running ? <LoaderCircle className="spin" aria-hidden="true" /> : <Plug aria-hidden="true" />}
        <span>
          {running ? "Using" : "Used"} {source ?? "a connector"}: {label.toLowerCase()}
        </span>
        {asked(props.args) ? <q className="tool-asked">{asked(props.args)}</q> : null}
      </summary>
      <div className="tool-line-body">
        <Inputs args={props.args} />
        {props.result !== undefined ? <pre className="tool-result">{resultText(props.result)}</pre> : null}
      </div>
    </details>
  );
};

type Saved = { saved: boolean; text?: string; reason?: string };

// What the assistant kept, or why it was refused, shown where it happened, with a way to change it.
export const RememberCard: ToolCallMessagePartComponent = ({ args, result }) => {
  const output = result as Saved | undefined;
  const text = (args as { text?: string }).text;
  if (!output) return <p className="memory-note">Saving to memory...</p>;
  return (
    <p className={output.saved ? "memory-note" : "memory-note memory-refused"}>
      <Brain aria-hidden="true" />
      <span>{output.saved ? `Saved to memory: ${text}` : `Not saved to memory. ${output.reason}`}</span>
      {output.saved ? <Link href="/memory">Manage</Link> : null}
    </p>
  );
};

export const ForgetCard: ToolCallMessagePartComponent = ({ result }) => {
  const output = result as { forgotten: boolean } | undefined;
  if (!output) return null;
  return (
    <p className="memory-note">
      <Brain aria-hidden="true" />
      <span>{output.forgotten ? "Removed from memory." : "There was no such memory."}</span>
    </p>
  );
};
