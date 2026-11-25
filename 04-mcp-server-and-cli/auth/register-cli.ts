import { DEVICE_CODE_GRANT_TYPE } from "@better-auth/oauth-provider";
import { cliClientId, saveCliClientId } from "../db/queries";
import { auth, MCP_RESOURCE, SCOPES } from "./auth";
import { clientOwnerSession } from "./client-owner";

// bun run seed mcp-server-and-cli runs this after the catalog.
// Registers the CLI once, as a public client: a program on someone's laptop cannot keep a secret,
// so it has no client secret, may use only the device flow and refresh tokens, and only for this server's /mcp.

const existing = await cliClientId();
if (existing) {
  console.log(`The CLI is already registered as ${existing}.`);
  process.exit(0);
}
const client = await auth.api.adminCreateOAuthClient({
  headers: await clientOwnerSession("learnwithparam CLI"),
  body: {
    client_name: "learnwithparam CLI",
    token_endpoint_auth_method: "none",
    application_type: "native",
    grant_types: [DEVICE_CODE_GRANT_TYPE, "refresh_token"],
    scope: SCOPES,
    resources: [MCP_RESOURCE],
  },
});
await saveCliClientId(client.client_id);
console.log(`Registered the CLI as ${client.client_id}.`);
process.exit(0);
