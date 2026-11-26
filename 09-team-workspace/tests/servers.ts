import { spawn } from "node:child_process";
import { pool } from "@bootcamp/db";
import { findProduct } from "@bootcamp/products";
import { CALLBACK, startConnect } from "../agent/oauth";

export const MCP_SERVER = `http://localhost:${findProduct("mcp-server-and-cli").port}`;

async function isUp(url: string): Promise<boolean> {
  const response = await fetch(url, { signal: AbortSignal.timeout(2_000) }).catch(() => undefined);
  return response?.ok ?? false;
}

// Uses a server you already run, or starts one for the test. Returns a stop function for the one it started.
export async function ensureRunning(slug: string, url: string): Promise<() => void> {
  if (await isUp(url)) return () => {};
  const server = spawn("bun", ["scripts/dev.ts", slug], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp(url)) return () => server.pid && process.kill(-server.pid);
    await Bun.sleep(1_000);
  }
  throw new Error(`${slug} did not start on ${url}.`);
}

// What an MCP server's admin does once: register the workspace as an app, with its callback address.
// The secret is read from the script's output in this process and never printed.
export async function registerApp(): Promise<{ clientId: string; clientSecret: string }> {
  const script = "04-mcp-server-and-cli/auth/register-app.ts";
  const run = Bun.spawn(["bun", script, "Team workspace test", CALLBACK, "--json"], { stderr: "inherit" });
  const output = await new Response(run.stdout).text();
  if ((await run.exited) !== 0) throw new Error("register-app failed.");
  return JSON.parse(output);
}

export async function removeApp(clientId: string) {
  const { rows } = await pool.query<{ userId: string }>(
    'delete from "oauthClient" where "clientId" = $1 returning "userId"',
    [clientId],
  );
  await pool.query('delete from "user" where id = any($1)', [rows.map((row) => row.userId)]);
}

// The person presses Connect, signs in to the MCP server (the same accounts here), and presses Allow.
// Returns the address the server sends them back to, with the one-time code on it.
export async function signInThroughServer(connectorId: string, userId: string, cookie: string): Promise<URL> {
  const authorize = await startConnect(connectorId, userId);
  if (!authorize) throw new Error("The person was connected already.");
  const toConsent = await fetch(authorize, { headers: { cookie }, redirect: "manual" });
  const consent = new URL(toConsent.headers.get("location") ?? "", MCP_SERVER);
  if (consent.pathname !== "/consent") throw new Error(`Expected the consent page, got ${consent.pathname}.`);
  const allowed = await fetch(`${MCP_SERVER}/api/auth/oauth2/consent`, {
    method: "POST",
    headers: { cookie, origin: MCP_SERVER, "content-type": "application/json" },
    body: JSON.stringify({ accept: true, oauth_query: consent.search.slice(1) }),
  });
  const body = (await allowed.json()) as { url?: string; redirect_uri?: string };
  const back = body.url ?? body.redirect_uri;
  if (!back) throw new Error(`Consent did not send the person back: ${JSON.stringify(body)}`);
  return new URL(back);
}
