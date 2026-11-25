import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { mcpServer } from "../../agent/mcp-server";
import { auth, MCP_RESOURCE } from "../../auth/auth";

// The MCP endpoint. requireMcpAuth checks the access token's signature, issuer, audience and expiry
// before any tool runs. A request without a token gets a 401 that tells the client where to sign in.
// claims.sub is the account id the token was issued to.

export const POST = requireMcpAuth(
  auth,
  (request, claims) => {
    const userId = typeof claims.sub === "string" ? claims.sub : null;
    // Only the 2026-07-28 protocol: each request stands alone, so there is no session to steal or lose.
    return createMcpHandler(() => mcpServer(userId), { legacy: "reject" }).fetch(request);
  },
  { resource: MCP_RESOURCE },
);
