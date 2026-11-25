"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { StatusChip, ToolCard } from "@bootcamp/ui/parts";
import { useState } from "react";

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

// "learnwithparam__save_for_later" reads as "learnwithparam: save for later".
function readable(toolName: string): { service: string; action: string } {
  const [service = "", name = toolName] = toolName.split("__");
  return { service, action: name.replaceAll("_", " ") };
}

// Every connector tool. One that may change something stops here until the person decides.
export const ConnectorCard: ToolCallMessagePartComponent = (props) => {
  const { toolName, args, result, status, approval, respondToApproval } = props;
  if (!approval) return <ToolCard {...props} />;
  const { service, action } = readable(toolName);
  return (
    <div className="card approval">
      <div className="card-head">
        <span className="label">
          {service}: {action}?
        </span>
        {approval.approved === false ? <span className="status status-fail">you said no</span> : null}
        {approval.approved === true ? <StatusChip running={status.type === "running"} /> : null}
      </div>
      <div className="card-body">
        <pre className="tool-input">{JSON.stringify(args, null, 2)}</pre>
        {result !== undefined ? <p>Done.</p> : null}
        {approval.approved === undefined ? <Decide respond={respondToApproval} /> : null}
      </div>
    </div>
  );
};

type Saved = { saved: boolean; text?: string; reason?: string };

// What the assistant kept, or why it was refused, shown where it happened.
export const RememberCard: ToolCallMessagePartComponent = ({ args, result }) => {
  const output = result as Saved | undefined;
  const text = (args as { text?: string }).text;
  if (!output) return <p className="memory-chip">Remembering...</p>;
  return output.saved ? (
    <p className="memory-chip">Remembered: {text}</p>
  ) : (
    <p className="memory-chip memory-refused">Not remembered: {output.reason}</p>
  );
};

export const ForgetCard: ToolCallMessagePartComponent = ({ result }) => {
  const output = result as { forgotten: boolean } | undefined;
  if (!output) return null;
  return <p className="memory-chip">{output.forgotten ? "Forgotten." : "There was no such memory."}</p>;
};
