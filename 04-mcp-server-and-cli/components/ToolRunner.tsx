"use client";

import { type FormEvent, useState } from "react";

export type ToolInfo = { name: string; description: string; personal: boolean; fields: Field[] };
export type Field = { name: string; required: boolean; choices: string[] | null };

// The tools page: each tool with its own small form. Run sends the form to /api/tools/<name>, which calls
// the very same function that chat, MCP and the CLI call.
export function ToolRunner({ tools, signedIn }: { tools: ToolInfo[]; signedIn: boolean }) {
  return (
    <section className="tools" aria-label="Tools">
      {tools.map((tool) => (
        <ToolCard key={tool.name} tool={tool} signedIn={signedIn} />
      ))}
    </section>
  );
}

function ToolCard({ tool, signedIn }: { tool: ToolInfo; signedIn: boolean }) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [running, setRunning] = useState(false);

  // onSubmit, not a form action: a form action clears the fields, and the result should sit next to its question.
  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setRunning(true);
    const input = Object.fromEntries([...form.entries()].filter(([, value]) => value !== ""));
    const response = await fetch(`/api/tools/${tool.name}`, { method: "POST", body: JSON.stringify(input) });
    const body: unknown = await response.json();
    setResult({ ok: response.ok, text: JSON.stringify(body, null, 2) });
    setRunning(false);
  }

  return (
    <form onSubmit={run} className="card tool">
      <div className="card-head">
        <span className="label">{tool.name}</span>
        {tool.personal ? (
          <span className={`status ${signedIn ? "status-pass" : "status-wait"}`}>needs sign-in</span>
        ) : null}
      </div>
      <div className="card-body">
        <p>{tool.description}</p>
        {tool.fields.map((field) => (
          <FieldInput key={field.name} field={field} />
        ))}
        <button type="submit" className="button button-primary" disabled={running}>
          {running ? "Running" : "Run"}
        </button>
        {result ? (
          <pre className={result.ok ? "tool-output" : "tool-output tool-error"}>{result.text}</pre>
        ) : null}
      </div>
    </form>
  );
}

function FieldInput({ field }: { field: Field }) {
  if (field.choices) {
    return (
      <select name={field.name} className="field" aria-label={field.name} required={field.required}>
        <option value="">{field.required ? `Pick a ${field.name}` : `Any ${field.name}`}</option>
        {field.choices.map((choice) => (
          <option key={choice}>{choice}</option>
        ))}
      </select>
    );
  }
  return <input name={field.name} className="field" placeholder={field.name} required={field.required} />;
}
