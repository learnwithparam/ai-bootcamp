import { model } from "@bootcamp/model";
import { generateText, stepCountIs, type ToolSet, tool } from "ai";
// The system prompt is plain text in instructions.md, next to this file.
import instructions from "./instructions.md" with { type: "text" };
import { TOOLS } from "./tools/all";
import { callTool } from "./tools/call";

// Start here. Every tool is written once in tools/ and read from one list, TOOLS.
//   - "Ask in plain words" on the web page turns them into AI SDK tools (below).
//   - mcp-server.ts turns them into MCP tools for Claude, Cursor and the CLI.
//   - The web page's tool runner calls them through the same callTool.
// The caller's account id always comes from that way in's own sign-in, never from what the model writes.

export function chatTools(userId: string | null): ToolSet {
  return Object.fromEntries(
    TOOLS.map((each) => [
      each.name,
      tool({
        description: each.description,
        inputSchema: each.input,
        execute: (input) => callTool(each, input, { userId, via: "ask" }),
      }),
    ]),
  );
}

// One plain-words question, one answer. The page shows the answer and every tool call that made it.
export async function ask(question: string, userId: string | null) {
  const result = await generateText({
    model: model(),
    system: instructions,
    prompt: question,
    tools: chatTools(userId),
    stopWhen: stepCountIs(4),
    experimental_telemetry: { isEnabled: true, functionId: "mcp-server-and-cli.ask" },
  });
  const calls = result.steps.flatMap((step) =>
    step.toolCalls.map((call) => ({
      tool: call.toolName,
      input: call.input as Record<string, unknown>,
      output: step.toolResults.find((each) => each.toolCallId === call.toolCallId)?.output ?? null,
    })),
  );
  const costUsd = result.steps.reduce(
    (sum, step) => sum + ((step.usage.raw as { cost?: number } | undefined)?.cost ?? 0),
    0,
  );
  return { text: result.text, calls, costUsd };
}
