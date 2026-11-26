import { randomBytes } from "node:crypto";
import {
  auth,
  type OAuthAuthorizationServerInformation,
  type OAuthClientInformation,
  type OAuthClientProvider,
  type OAuthTokens,
} from "@ai-sdk/mcp";
import { portOf } from "@bootcamp/products";
import { type ConnectorSecrets, connectionOf, connectorSecrets, saveConnection } from "../db/connectors";
import { connectorInState, stateFor } from "../rules/connectors";

// The workspace signs each person in to each connector with OAuth, as a client the server registered in advance.
// Every value the flow needs (tokens, the PKCE verifier, the state) is saved sealed, per person and connector,
// so the flow survives the trip through the browser and a server restart.

export const APP_URL = process.env.TEAM_WORKSPACE_URL ?? `http://localhost:${portOf("team-workspace")}`;
export const CALLBACK = `${APP_URL}/api/connectors/callback`;
const SCOPES = "openid profile email offline_access";

export class ConnectorOAuth implements OAuthClientProvider {
  // Where the person must go to sign in. Set when the library asks for a redirect.
  authorizationUrl?: URL;

  constructor(
    readonly connector: ConnectorSecrets,
    readonly userId: string,
  ) {}

  get redirectUrl() {
    return CALLBACK;
  }

  get clientMetadata() {
    return {
      client_name: "Team workspace",
      redirect_uris: [CALLBACK],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_basic",
      scope: SCOPES,
    };
  }

  // The issuer ties this client id and secret to one sign-in server. Tokens are never asked for anywhere else.
  clientInformation(): OAuthClientInformation {
    const { clientId, clientSecret, issuer } = this.connector;
    return { client_id: clientId, client_secret: clientSecret, issuer };
  }

  // The sign-in server found when the admin added the connector. Tokens are only ever asked for there.
  authorizationServerInformation(): OAuthAuthorizationServerInformation {
    const { issuer, signInServer, tokenEndpoint } = this.connector;
    return { issuer, authorizationServerUrl: signInServer, tokenEndpoint };
  }

  // The library hands back what it found this time. A server that moved its sign-in is refused, not followed.
  saveAuthorizationServerInformation(found: OAuthAuthorizationServerInformation) {
    const pinned = this.authorizationServerInformation();
    const same = (a: string | URL, b: string | URL) => new URL(a).href === new URL(b).href;
    const matches =
      same(found.authorizationServerUrl, pinned.authorizationServerUrl) &&
      same(found.tokenEndpoint, pinned.tokenEndpoint) &&
      (found.issuer === undefined || found.issuer === pinned.issuer);
    if (!matches)
      throw new Error(`${this.connector.name} changed its sign-in server. Ask an admin to add it again.`);
  }

  validateAuthorizationServerURL(_server: string | URL, authorizationServer: string | URL) {
    if (new URL(authorizationServer).origin !== new URL(this.connector.issuer).origin)
      throw new Error(`${this.connector.name} sent us to another sign-in server. Nothing was sent there.`);
  }

  private save(field: "tokens" | "codeVerifier" | "state", value?: string) {
    return saveConnection(this.connector.id, this.userId, field, value);
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const { tokens } = await connectionOf(this.connector.id, this.userId);
    return tokens ? (JSON.parse(tokens) as OAuthTokens) : undefined;
  }

  saveTokens(tokens: OAuthTokens) {
    return this.save("tokens", JSON.stringify(tokens));
  }

  redirectToAuthorization(url: URL) {
    this.authorizationUrl = url;
  }

  saveCodeVerifier(verifier: string) {
    return this.save("codeVerifier", verifier);
  }

  async codeVerifier(): Promise<string> {
    const { codeVerifier } = await connectionOf(this.connector.id, this.userId);
    if (!codeVerifier) throw new Error("This sign-in has expired. Press Connect again.");
    return codeVerifier;
  }

  state() {
    return stateFor(this.connector.id, randomBytes(16).toString("hex"));
  }

  saveState(state: string) {
    return this.save("state", state);
  }

  async storedState() {
    return (await connectionOf(this.connector.id, this.userId)).state;
  }

  async invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier") {
    if (scope === "all" || scope === "tokens") await this.save("tokens");
    if (scope === "all" || scope === "verifier") await this.save("codeVerifier");
  }
}

export async function providerFor(connectorId: string, userId: string): Promise<ConnectorOAuth> {
  const connector = await connectorSecrets(connectorId);
  if (!connector) throw new Error("That connector was removed.");
  return new ConnectorOAuth(connector, userId);
}

// Connect: returns the sign-in page to send the person to, or null when they are signed in already.
export async function startConnect(connectorId: string, userId: string): Promise<URL | null> {
  const provider = await providerFor(connectorId, userId);
  const result = await auth(provider, { serverUrl: provider.connector.url, scope: SCOPES });
  if (result === "AUTHORIZED") return null;
  if (!provider.authorizationUrl) throw new Error("The server did not give a sign-in page.");
  return provider.authorizationUrl;
}

// The server sent the person back with a code. The state must be the one saved for this person,
// so a link made for someone else, or replayed, signs nobody in.
export async function finishConnect(userId: string, query: URLSearchParams): Promise<string> {
  const state = query.get("state") ?? "";
  const code = query.get("code");
  const connectorId = connectorInState(state);
  if (!connectorId || !code) throw new Error(query.get("error_description") ?? "The sign-in was cancelled.");
  const provider = await providerFor(connectorId, userId);
  if ((await provider.storedState()) !== state)
    throw new Error("This sign-in link is not yours, or was used.");
  await auth(provider, {
    serverUrl: provider.connector.url,
    authorizationCode: code,
    callbackState: state,
    callbackIssuer: query.get("iss") ?? undefined,
  });
  await provider.invalidateCredentials("verifier");
  await saveConnection(connectorId, userId, "state");
  return provider.connector.name;
}
