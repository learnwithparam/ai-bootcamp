import { createMCPClient, type MCPClient, UnauthorizedError } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import { allConnectors, connectedIds, type PublicConnector } from "../db/connectors";
import { needsApproval, toolKey } from "../rules/connectors";
import { providerFor } from "./oauth";

// Opens every connector this person has signed in to, for one reply, and closes them after it.
// A connector that fails is never dropped quietly: the reply is told, so it can say so, and the server logs it.

export type OpenConnectors = {
  tools: ToolSet;
  needApproval: string[];
  notes: string[];
  close: () => Promise<void>;
};

const CONNECT_TIMEOUT_MS = 8_000;

function withTimeout<T>(work: Promise<T>, name: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${name} did not answer within 8 seconds.`)), CONNECT_TIMEOUT_MS),
  );
  return Promise.race([work, timeout]);
}

async function openOne(connector: PublicConnector, userId: string) {
  const authProvider = await providerFor(connector.id, userId);
  const client = await createMCPClient({ transport: { type: "http", url: connector.url, authProvider } });
  try {
    const definitions = await client.listTools();
    const tools = client.toolsFromDefinitions(definitions);
    const renamed: ToolSet = {};
    const needApproval: string[] = [];
    for (const definition of definitions.tools) {
      const key = toolKey(connector.slug, definition.name);
      const tool = tools[definition.name];
      if (!tool) continue;
      const description = `${connector.name}: ${tool.description ?? definition.name}`;
      renamed[key] = { ...tool, description } as ToolSet[string];
      if (needsApproval(definition.annotations)) needApproval.push(key);
    }
    return { client, tools: renamed, needApproval };
  } catch (error) {
    await client.close();
    throw error;
  }
}

function noteFor(connector: PublicConnector, error: unknown): string {
  if (error instanceof UnauthorizedError)
    return `${connector.name}: the person's sign-in has ended. Ask them to press Connect on the Connectors page.`;
  return `${connector.name}: could not be reached just now, so its tools are missing from this reply.`;
}

export async function openConnectors(userId: string): Promise<OpenConnectors> {
  const [all, signedIn] = await Promise.all([allConnectors(), connectedIds(userId)]);
  const result: OpenConnectors = { tools: {}, needApproval: [], notes: [], close: async () => {} };
  const clients: MCPClient[] = [];
  for (const connector of all) {
    if (!signedIn.includes(connector.id)) {
      result.notes.push(
        `${connector.name}: not connected. The person can connect it on the Connectors page.`,
      );
      continue;
    }
    try {
      const opened = await withTimeout(openOne(connector, userId), connector.name);
      clients.push(opened.client);
      Object.assign(result.tools, opened.tools);
      result.needApproval.push(...opened.needApproval);
      result.notes.push(`${connector.name}: connected.`);
    } catch (error) {
      console.error(`team-workspace: connector ${connector.name} failed`, error);
      result.notes.push(noteFor(connector, error));
    }
  }
  result.close = async () => {
    await Promise.all(clients.map((client) => client.close()));
  };
  return result;
}
