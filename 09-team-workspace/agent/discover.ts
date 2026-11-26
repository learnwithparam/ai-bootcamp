import type { SignIn } from "../rules/connectors";

// When an admin adds a connector, the workspace asks the server who signs people in for it, as MCP describes:
// the server's protected-resource page names its sign-in server, and that server's metadata names its issuer.
// A server that does not answer both is refused, so a connector that cannot work is never added.

async function json(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000), redirect: "error" });
  if (!response.ok) throw new Error(`${url} answered ${response.status}.`);
  return (await response.json()) as Record<string, unknown>;
}

function wellKnown(base: string, name: string): string {
  const url = new URL(base);
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.origin}/.well-known/${name}${path}`;
}

export async function discoverSignIn(serverUrl: string): Promise<SignIn> {
  const resource = await json(wellKnown(serverUrl, "oauth-protected-resource"));
  const signInServer = (resource.authorization_servers as string[] | undefined)?.[0];
  if (!signInServer) throw new Error("The server does not say who signs people in for it.");
  const metadata = await json(wellKnown(signInServer, "oauth-authorization-server"));
  const { issuer, token_endpoint: tokenEndpoint } = metadata;
  if (typeof issuer !== "string" || typeof tokenEndpoint !== "string")
    throw new Error("The sign-in server does not name its issuer and token address.");
  return { issuer, signInServer, tokenEndpoint };
}
