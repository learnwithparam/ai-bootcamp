"use client";

import { LogIn, Play } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import type { Field, ToolInfo } from "../agent/tools/describe";
import { CallItFrom } from "./CallItFrom";
import { type Outcome, ToolResult } from "./ToolResult";

function Control({ id, field, onChange }: { id: string; field: Field; onChange: (value: string) => void }) {
  if (!field.choices)
    return (
      <input
        id={id}
        name={field.name}
        className="field"
        required={field.required}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  return (
    <select id={id} name={field.name} required={field.required} onChange={(e) => onChange(e.target.value)}>
      <option value="">{field.required ? `Pick a ${field.name}` : `Any ${field.name}`}</option>
      {field.choices.map((choice) => (
        <option key={choice}>{choice}</option>
      ))}
    </select>
  );
}

function FieldInput({
  tool,
  field,
  onChange,
}: {
  tool: string;
  field: Field;
  onChange: (value: string) => void;
}) {
  const id = `${tool}-${field.name}`;
  const label = field.name.charAt(0).toUpperCase() + field.name.slice(1);
  return (
    <div className="form-row">
      <label htmlFor={id}>
        {label} {field.required ? null : <span className="form-hint-inline">optional</span>}
      </label>
      <Control id={id} field={field} onChange={onChange} />
      {field.hint ? <p className="form-hint">{field.hint}</p> : null}
    </div>
  );
}

function OutcomeView({ outcome }: { outcome: Outcome }) {
  const [raw, setRaw] = useState(false);
  return (
    <div className="panel-body tool-outcome">
      <div className="tool-outcome-head">
        <h3>Result</h3>
        <button type="button" className="button button-quiet" onClick={() => setRaw(!raw)} aria-pressed={raw}>
          {raw ? "Show as a list" : "Show JSON"}
        </button>
      </div>
      {raw ? (
        <pre className="snippet">{JSON.stringify(outcome.body, null, 2)}</pre>
      ) : (
        <ToolResult outcome={outcome} />
      )}
    </div>
  );
}

type FormProps = {
  tool: ToolInfo;
  locked: boolean;
  running: boolean;
  onRun: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: string, value: string) => void;
};

function ToolForm({ tool, locked, running, onRun, onChange }: FormProps) {
  return (
    <form onSubmit={onRun} className="tool-form">
      {tool.fields.map((field) => (
        <FieldInput
          key={field.name}
          tool={tool.name}
          field={field}
          onChange={(value) => onChange(field.name, value)}
        />
      ))}
      {tool.fields.length ? null : <p className="form-hint">This tool takes no input.</p>}
      {locked ? (
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/?tool=${tool.name}`)}`}
          className="button button-primary"
        >
          <LogIn aria-hidden="true" /> Sign in to run it
        </Link>
      ) : (
        <button type="submit" className="button button-primary" disabled={running}>
          <Play aria-hidden="true" /> {running ? "Running" : "Run"}
        </button>
      )}
    </form>
  );
}

// Calls the tool's route. A request that never reaches the server reads as a failed run, not a spinner.
async function callRoute(name: string, filled: Record<string, string>): Promise<Outcome> {
  try {
    const response = await fetch(`/api/tools/${name}`, { method: "POST", body: JSON.stringify(filled) });
    return { ok: response.ok, body: (await response.json()) as Record<string, unknown> };
  } catch (error) {
    console.error(`Running ${name} failed`, error);
    return { ok: false, body: { error: "Could not reach the server. Check it is running, then try again." } };
  }
}

// One tool: its form, built from its schema, and what it returned. Run calls /api/tools/<name>, the very
// same function Claude, Cursor and the CLI reach over MCP.
export function ToolDetail({ tool, signedIn }: { tool: ToolInfo; signedIn: boolean }) {
  const [input, setInput] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [running, setRunning] = useState(false);
  const locked = tool.personal && !signedIn;

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunning(true);
    const filled = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== ""));
    setOutcome(await callRoute(tool.name, filled));
    setRunning(false);
  }

  return (
    <section className="panel tool-detail-panel" aria-labelledby="tool-title">
      <div className="panel-body">
        <h2 id="tool-title">{tool.title}</h2>
        <p className="tool-description">{tool.description}</p>
        <ToolForm
          tool={tool}
          locked={locked}
          running={running}
          onRun={run}
          onChange={(field, value) => setInput((now) => ({ ...now, [field]: value }))}
        />
      </div>
      {outcome ? <OutcomeView outcome={outcome} /> : null}
      <CallItFrom tool={tool} input={input} />
    </section>
  );
}
