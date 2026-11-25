import { model } from "@bootcamp/model";
import { convertToModelMessages, stepCountIs, streamText, type ToolSet, tool, type UIMessage } from "ai";
// The system prompt is plain text in instructions.md, next to this file.
import instructions from "./instructions.md" with { type: "text" };
import { TOOLS } from "./tools/all";

// Start here. Every tool is written once in tools/ and read from one list, TOOLS.
//   - The chat on the web page turns them into AI SDK tools (below).
//   - mcp-server.ts turns them into MCP tools for Claude, Cursor and the CLI.
//   - The web page's tool runner calls them directly.
// The caller's account id always comes from that way in's own sign-in, never from what the model writes.

export function chatTools(userId: string | null): ToolSet {
  return Object.fromEntries(
    TOOLS.map((each) => [
      each.name,
      tool({
        description: each.description,
        inputSchema: each.input,
        execute: (input) => each.run(input, userId),
      }),
    ]),
  );
}

export async function answer(messages: UIMessage[], userId: string | null) {
  return streamText({
    model: model(),
    system: instructions,
    messages: await convertToModelMessages(messages),
    tools: chatTools(userId),
    stopWhen: stepCountIs(4),
    experimental_telemetry: { isEnabled: true, functionId: "mcp-server-and-cli.chat" },
  });
}
