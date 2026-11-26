"use client";

import { useState } from "react";
import type { ToolInfo } from "../agent/tools/describe";
import { cliCommand, mcpCall } from "../rules/plain";

type Way = "cli" | "mcp";

// The same call, from the other two ways in. It follows the form as the person types.
export function CallItFrom({ tool, input }: { tool: ToolInfo; input: Record<string, string> }) {
  const [way, setWay] = useState<Way>("cli");
  const firstRequired = tool.fields.find((field) => field.required)?.name;
  const text = way === "cli" ? cliCommand(tool.name, input, firstRequired) : mcpCall(tool.name, input);
  return (
    <div className="panel-body call-it-from">
      <div className="tool-outcome-head">
        <h3>Call it from</h3>
        <fieldset className="segmented">
          <legend className="sr-only">Way in</legend>
          <button type="button" aria-pressed={way === "cli"} onClick={() => setWay("cli")}>
            Terminal
          </button>
          <button type="button" aria-pressed={way === "mcp"} onClick={() => setWay("mcp")}>
            Claude or Cursor
          </button>
        </fieldset>
      </div>
      <pre className="snippet">{text}</pre>
      <p className="form-hint">
        {way === "cli" ? (
          <>
            Run it from the repo root after <code>bun run cli login</code>.
          </>
        ) : (
          <>
            What Claude or Cursor sends to <code>/mcp</code> when it picks this tool. You never type it.
          </>
        )}
      </p>
    </div>
  );
}
