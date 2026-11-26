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
  if (!slugOf(form.name)) return CONNECTOR_FAILURES.name;
  if (takenNames.some((name) => slugOf(name) === slugOf(form.name))) return CONNECTOR_FAILURES.taken;
  if (!URL.canParse(form.url)) return CONNECTOR_FAILURES.address;
  const url = new URL(form.url);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && LOOPBACK.has(url.hostname)))
    return CONNECTOR_FAILURES.https;
  if (!form.clientId.trim() || !form.clientSecret.trim()) return CONNECTOR_FAILURES.client;
  return null;
}

// Every failure the Connectors page may show. A notice that is not one of these is ignored.
export const CONNECTOR_FAILURES = {
  name: "Give the connector a name with letters or digits.",
  taken: "A connector with that name is already added.",
  address: "The server address must be a full link, like https://example.com/mcp.",
  https: "The server address must use https.",
  client: "Paste the client id and the client secret the server gave you.",
  start: "That server could not start a sign-in. Check that it is running.",
  discover: "That address did not answer as an MCP server with sign-in. Nothing was saved.",
  callback: "The sign-in did not finish. Press Connect to try again.",
} as const;

// The OAuth state names the connector, then a random part, so the callback knows which server answered.
export function stateFor(connectorId: string, random: string): string {
  return `${connectorId}.${random}`;
}

export function connectorInState(state: string): string | null {
  const [connectorId, random] = state.split(".");
  return connectorId && random ? connectorId : null;
}
