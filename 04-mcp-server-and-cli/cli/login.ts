import { readTokens, saveTokens, type Tokens } from "./tokens";

// Sign-in for a terminal, the OAuth device flow (RFC 8628):
//   1. ask the server for a code,  2. you approve it in a browser,  3. the CLI picks up its tokens.
// The CLI never sees your password.

const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";
type TokenReply = { access_token: string; refresh_token: string; expires_in: number };

async function post(url: string, body: Record<string, string>, form = false): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json" },
    body: form ? new URLSearchParams(body) : JSON.stringify(body),
  });
}

function toTokens(server: string, clientId: string, reply: TokenReply): Tokens {
  const expiresAt = Date.now() + reply.expires_in * 1000;
  return { server, clientId, accessToken: reply.access_token, refreshToken: reply.refresh_token, expiresAt };
}

async function waitForApproval(
  server: string,
  clientId: string,
  code: { device_code: string; interval: number },
) {
  for (;;) {
    await Bun.sleep(code.interval * 1000);
    const body = { grant_type: DEVICE_GRANT, device_code: code.device_code, client_id: clientId };
    const response = await post(`${server}/api/auth/oauth2/token`, body, true);
    const reply = (await response.json()) as TokenReply & { error?: string };
    if (response.ok) return reply;
    if (reply.error === "slow_down") code.interval += 5;
    else if (reply.error !== "authorization_pending") throw new Error(`Sign-in stopped: ${reply.error}.`);
  }
}

export async function login(server: string): Promise<string> {
  const setup = await fetch(`${server}/api/cli-client`);
  if (!setup.ok) throw new Error(`${server} is not ready: ${await setup.text()}`);
  const { clientId, resource, scope } = (await setup.json()) as Partial<Record<string, string>>;
  if (!clientId || !resource || !scope)
    throw new Error(`${server}/api/cli-client did not name the client to sign in with.`);
  const started = await post(`${server}/api/auth/device/code`, { client_id: clientId, scope, resource });
  if (!started.ok) throw new Error(`Could not start sign-in: ${await started.text()}`);
  const code = (await started.json()) as { device_code: string; user_code: string; interval: number };
  console.log(`Open ${server}/device and type ${code.user_code}`);
  console.log("Waiting for you to approve it in the browser...");
  const tokens = toTokens(server, clientId, await waitForApproval(server, clientId, code));
  await saveTokens(tokens);
  return tokens.accessToken;
}

// A short-lived access token, refreshed with the refresh token when it is about to run out.
export async function accessToken(server: string): Promise<string | null> {
  const tokens = await readTokens();
  if (!tokens || tokens.server !== server) return null;
  if (tokens.expiresAt - Date.now() > 60_000) return tokens.accessToken;
  const body = {
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    client_id: tokens.clientId,
  };
  const response = await post(`${server}/api/auth/oauth2/token`, body, true);
  if (!response.ok) return null;
  const fresh = toTokens(server, tokens.clientId, (await response.json()) as TokenReply);
  await saveTokens(fresh);
  return fresh.accessToken;
}
