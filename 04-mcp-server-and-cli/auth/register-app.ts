import { auth, MCP_RESOURCE, SCOPES } from "./auth";
import { clientOwnerSession } from "./client-owner";

// bun 04-mcp-server-and-cli/auth/register-app.ts "Team workspace" http://localhost:3109/api/connectors/callback
// Registers a web app that connects to this server for its users, like the team workspace in 09.
// A web app runs on a server, so it can keep a secret: it gets a client id and a client secret,
// may send people back only to the one address given here, and its tokens work only for this server's /mcp.
// The secret is printed once. Paste it into the app; it is not stored here in a form anyone can read back.

const [name, redirect] = process.argv.slice(2);
const asJson = process.argv.includes("--json");
if (!name || !redirect || !URL.canParse(redirect) || !/^https?:$/.test(new URL(redirect).protocol)) {
  throw new Error(
    'Usage: bun 04-mcp-server-and-cli/auth/register-app.ts "App name" https://app.example/callback',
  );
}
const client = await auth.api.adminCreateOAuthClient({
  headers: await clientOwnerSession(name),
  body: {
    client_name: name,
    redirect_uris: [redirect],
    token_endpoint_auth_method: "client_secret_basic",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: SCOPES,
    resources: [MCP_RESOURCE],
  },
});
if (asJson) {
  console.log(JSON.stringify({ clientId: client.client_id, clientSecret: client.client_secret }));
} else {
  console.log(`Registered ${name}. Paste these into the app; the secret is shown only now.`);
  console.log(`Client id:     ${client.client_id}`);
  console.log(`Client secret: ${client.client_secret}`);
}
process.exit(0);
