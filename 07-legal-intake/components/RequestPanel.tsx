"use client";

import { Check, Send, X } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
import { type Draft, FIELDS, type FieldName, missing } from "../rules/collect";
import type { FormState } from "./IntakeDesk";

type Edit = (change: Partial<Draft>) => void;

function Row({
  name,
  form,
  hint,
  children,
}: {
  name: FieldName;
  form: FormState;
  hint?: string;
  children: ReactNode;
}) {
  const field = FIELDS.find((each) => each.name === name);
  const byAgent = form.byAgent.includes(name);
  return (
    <div className={`form-row request-row${byAgent ? " request-row-agent" : ""}`}>
      <label htmlFor={name} className="field-label">
        {field?.label}
        {field?.required ? null : <span className="form-hint"> (if there is one)</span>}
      </label>
      {children}
      {byAgent ? (
        <p className="form-hint agent-note">Filled in from your messages. Change it if it is wrong.</p>
      ) : null}
      {hint ? <p className="form-hint">{hint}</p> : null}
    </div>
  );
}

function Parties({ form, onEdit }: { form: FormState; onEdit: Edit }) {
  const [adding, setAdding] = useState("");
  const parties = form.draft.otherParties;
  const add = () => {
    if (adding.trim()) onEdit({ otherParties: [...parties, adding.trim()] });
    setAdding("");
  };
  return (
    <Row name="otherParties" form={form} hint="A person, a landlord, a company or an employer.">
      <ul className="chips" aria-label="The other side">
        {parties.map((name) => (
          <li key={name} className={form.byAgent.includes("otherParties") ? "chip agent-filled" : "chip"}>
            {name}
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={() => onEdit({ otherParties: parties.filter((each) => each !== name) })}
            >
              <X aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="chip-add">
        <input
          id="otherParties"
          className="field"
          value={adding}
          placeholder="Add a name"
          onChange={(event) => setAdding(event.target.value)}
        />
        <button type="button" className="button button-quiet" onClick={add}>
          Add
        </button>
      </div>
    </Row>
  );
}

function KeyDate({ form, onEdit }: { form: FormState; onEdit: Edit }) {
  const keyDate = form.draft.keyDate;
  const quote = keyDate?.quote
    ? `You wrote: "${keyDate.quote}"`
    : "A hearing, an eviction, or the end of a notice period.";
  return (
    <Row name="keyDate" form={form} hint={quote}>
      <input
        id="keyDate"
        type="date"
        className={form.byAgent.includes("keyDate") ? "field agent-filled" : "field"}
        value={keyDate?.date ?? ""}
        onChange={(event) =>
          onEdit({ keyDate: event.target.value ? { date: event.target.value, quote: "" } : null })
        }
      />
    </Row>
  );
}

function Text({
  name,
  form,
  onEdit,
  type = "text",
}: {
  name: "clientName" | "clientEmail" | "goal";
  form: FormState;
  onEdit: Edit;
  type?: string;
}) {
  const className = form.byAgent.includes(name) ? "field agent-filled" : "field";
  const value = form.draft[name];
  const change = (text: string) => onEdit({ [name]: text });
  return (
    <Row name={name} form={form}>
      {name === "goal" ? (
        <textarea
          id={name}
          className={className}
          rows={2}
          value={value}
          onChange={(event) => change(event.target.value)}
        />
      ) : (
        <input
          id={name}
          type={type}
          className={className}
          value={value}
          onChange={(event) => change(event.target.value)}
        />
      )}
    </Row>
  );
}

function Progress({ draft }: { draft: Draft }) {
  const required = FIELDS.filter((field) => field.required);
  const left = missing(draft);
  return (
    <div className="request-progress">
      <span>
        {required.length - left.length} of {required.length} needed
      </span>
      <ol aria-label="What we still need">
        {required.map((field) => (
          <li key={field.name} className={left.includes(field.name) ? "" : "done"}>
            {left.includes(field.name) ? null : <Check aria-hidden="true" />} {field.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

// The structured request the firm receives. The agent fills it from the conversation; the client owns it.
export function RequestPanel({
  form,
  onEdit,
  onSend,
  canSend,
}: {
  form: FormState;
  onEdit: Edit;
  onSend: () => Promise<void>;
  canSend: boolean;
}) {
  const [sending, startSending] = useTransition();
  const ready = missing(form.draft).length === 0;
  return (
    <aside className="request-panel" aria-label="Your request">
      <h2>Your request</h2>
      <Progress draft={form.draft} />
      <Text name="clientName" form={form} onEdit={onEdit} />
      <Text name="clientEmail" form={form} onEdit={onEdit} type="email" />
      <Parties form={form} onEdit={onEdit} />
      <KeyDate form={form} onEdit={onEdit} />
      <Text name="goal" form={form} onEdit={onEdit} />
      <button
        type="button"
        className="button button-primary request-send"
        disabled={!ready || !canSend || sending}
        onClick={() => startSending(onSend)}
      >
        <Send aria-hidden="true" /> {sending ? "Sending..." : "Send request"}
      </button>
      <p className="form-hint">We send the firm this form and your messages. A lawyer reads every request.</p>
    </aside>
  );
}
