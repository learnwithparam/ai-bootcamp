import { MCP_RESOURCE, SCOPES } from "../../../auth/auth";
import { cliClientId } from "../../../db/queries";

// What the CLI needs before it can sign in. A public client id is not a secret: it only names the CLI.
export async function GET() {
  const clientId = await cliClientId();
  if (!clientId)
    return Response.json({ error: "Run `bun run seed mcp-server-and-cli` first." }, { status: 503 });
  return Response.json({ clientId, resource: MCP_RESOURCE, scope: SCOPES });
}
