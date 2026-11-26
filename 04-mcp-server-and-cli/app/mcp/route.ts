import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { mcpServer } from "../../agent/mcp-server";
import { auth, MCP_RESOURCE } from "../../auth/auth";
import { hasGrant } from "../../db/apps";

// The MCP endpoint. requireMcpAuth checks the access token's signature, issuer, audience and expiry
// before any tool runs. A request without a token gets a 401 that tells the client where to sign in.
// claims.sub is the account the token was issued to, and claims.azp is the app that holds it.

// A token stays valid until it expires, so the account's grant is checked too: revoking an app works at once.
function revoked(): Response {
  return Response.json(
    { error: "invalid_token", error_description: "This app's access was revoked. Sign in again." },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' } },
  );
}

export const POST = requireMcpAuth(
  auth,
  async (request, claims) => {
    const userId = typeof claims.sub === "string" ? claims.sub : null;
    const clientId = typeof claims.azp === "string" ? claims.azp : null;
    if (!userId || !clientId || !(await hasGrant(userId, clientId))) return revoked();
    const caller = { userId, via: "app" as const, clientId };
    // Only the 2026-07-28 protocol: each request stands alone, so there is no session to steal or lose.
    return createMcpHandler(() => mcpServer(caller), { legacy: "reject" }).fetch(request);
  },
  { resource: MCP_RESOURCE },
);
