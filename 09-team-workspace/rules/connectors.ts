// Connectors: which MCP servers may be added, how their tools are named, and which tools wait for a person.

// Who signs people in for an MCP server: found once when an admin adds it, then pinned.
export type SignIn = { issuer: string; signInServer: string; tokenEndpoint: string };

export type ConnectorForm = { name: string; url: string; clientId: string; clientSecret: string };

// The short name in front of each tool, so two servers that both have a "search" tool never clash.
export function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

// Model providers allow letters, digits, _ and - in a tool name, up to 64 characters.
export function toolKey(slug: string, toolName: string): string {
  return `${slug}__${toolName.replace(/[^a-zA-Z0-9_-]/g, "_")}`.slice(0, 64);
}

// A server that does not promise a tool only reads, waits for a person before that tool runs.
// The promise is the server's own readOnlyHint. A missing hint counts as "may change something".
export function needsApproval(annotations: { readOnlyHint?: boolean } | undefined): boolean {
  return annotations?.readOnlyHint !== true;
}

const LOOPBACK = new Set(["localhost", "127.0.0.1"]);

// null when an admin may add the connector, otherwise the reason. Tokens travel to this address, so it needs https,
// except for a server on this same computer.
export function whyNotAdd(form: ConnectorForm, takenNames: string[]): string | null {
  if (!slugOf(form.name)) return "Give the connector a name with letters or digits.";
  if (takenNames.some((name) => slugOf(name) === slugOf(form.name)))
    return "A connector with that name is already added.";
  if (!URL.canParse(form.url)) return "The server address must be a full link, like https://example.com/mcp.";
  const url = new URL(form.url);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && LOOPBACK.has(url.hostname)))
    return "The server address must use https.";
  if (!form.clientId.trim() || !form.clientSecret.trim())
    return "Paste the client id and the client secret the server gave you.";
  return null;
}

// The OAuth state names the connector, then a random part, so the callback knows which server answered.
export function stateFor(connectorId: string, random: string): string {
  return `${connectorId}.${random}`;
}

export function connectorInState(state: string): string | null {
  const [connectorId, random] = state.split(".");
  return connectorId && random ? connectorId : null;
}
