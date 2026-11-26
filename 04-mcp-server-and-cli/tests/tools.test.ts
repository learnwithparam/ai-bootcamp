import { afterAll, describe, expect, test } from "bun:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { inArray } from "drizzle-orm";
import { chatTools } from "../agent/agent";
import { mcpServer } from "../agent/mcp-server";
import { TOOLS } from "../agent/tools/all";
import { SignInNeeded } from "../agent/tools/tool";
import { allItems, db } from "../db/queries";
import { saved } from "../db/schema";

// One set of tools, three ways in. This test walks every tool, so a new tool is covered with no new test:
// it must be in the chat, in the MCP server's list, and, if personal, refuse a caller who is not signed in.
// The CLI lists and calls tools through MCP, so the MCP check covers it too.

const USER = `test-${crypto.randomUUID()}`;

afterAll(async () => {
  await db.delete(saved).where(inArray(saved.userId, [USER]));
});

// The real MCP server, called in this process with the real client: no network and no sign-in step.
async function mcpClient(userId: string | null): Promise<Client> {
  const handler = createMcpHandler(() => mcpServer({ userId, via: "app" }), { legacy: "reject" });
  const client = new Client(
    { name: "test", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  const fetch = (url: string | URL | Request, init?: RequestInit) => handler.fetch(new Request(url, init));
  await client.connect(new StreamableHTTPClientTransport(new URL("http://test.invalid/mcp"), { fetch }));
  return client;
}

describe.each(TOOLS.map((tool) => [tool.name, tool] as const))("%s", (name, tool) => {
  test("is offered in the chat with the same description", () => {
    expect(chatTools(null)[name]?.description).toBe(tool.description);
  });

  test("is offered over MCP with the same description", async () => {
    const { tools } = await (await mcpClient(null)).listTools();
    expect(tools.find((each) => each.name === name)?.description).toBe(tool.description);
  });

  test.if(tool.personal)("refuses a caller who is not signed in, in every way in", async () => {
    await expect(tool.run({}, null)).rejects.toBeInstanceOf(SignInNeeded);
    const result = await (await mcpClient(null)).callTool({ name, arguments: {} });
    expect(result.isError).toBe(true);
  });
});

test("a personal tool over MCP acts for the signed-in account only", async () => {
  const [item] = await allItems();
  if (!item) throw new Error("No catalog in Postgres. Run `bun run seed mcp-server-and-cli`.");
  const client = await mcpClient(USER);
  await client.callTool({ name: "save_for_later", arguments: { url: item.url } });
  const result = await client.callTool({ name: "my_saved_list", arguments: {} });
  const text = result.content.find((part) => part.type === "text");
  expect(text?.type === "text" ? JSON.parse(text.text).items[0].url : null).toBe(item.url);
});
