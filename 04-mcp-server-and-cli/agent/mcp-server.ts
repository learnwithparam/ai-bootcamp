import { McpServer } from "@modelcontextprotocol/server";
import { TOOLS } from "./tools/all";

// The MCP server: the same tools, in the shape Claude, Cursor and the CLI understand.
// A new server is made for each request, for the one signed-in caller, so callers never share state.
export function mcpServer(userId: string | null): McpServer {
  const server = new McpServer({ name: "learnwithparam", version: "1.0.0" });
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.input,
        annotations: { readOnlyHint: !tool.changesData },
      },
      async (input) => {
        const output = await tool.run(input, userId);
        return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] };
      },
    );
  }
  return server;
}
