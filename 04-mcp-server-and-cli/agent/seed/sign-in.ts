import { createHash, randomBytes } from "node:crypto";
import { DEVICE_CODE_GRANT_TYPE } from "@better-auth/oauth-provider";
import { auth, MCP_RESOURCE, SCOPES, SERVER_URL } from "../../auth/auth";

// The seed's sign-ins, done the real way: each request goes through better-auth's own handler,
// the same code the server runs, so the grants it leaves are the ones a person would leave.

const api = (path: string) => `${SERVER_URL}/api/auth${path}`;

async function call(path: string, init: RequestInit): Promise<Response> {
  const response = await auth.handler(new Request(api(path), init));
  if (response.status >= 400)
    throw new Error(`${path} answered ${response.status}: ${await response.text()}`);
  return response;
}

const form = (body: Record<string, string>) => ({
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(body),
});

// Signs in with email and password, and returns the session cookie a browser would keep.
export async function signIn(email: string, password: string): Promise<string> {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  return headers
    .getSetCookie()
    .map((each) => each.split(";")[0])
    .join("; ");
}

// The CLI's device flow: ask for a code, approve it as the signed-in person, then trade it for tokens.
export async function deviceFlow(clientId: string, cookie: string): Promise<void> {
  const started = await call("/device/code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: clientId, scope: SCOPES, resource: MCP_RESOURCE }),
  });
  const code = (await started.json()) as { device_code: string; user_code: string };
  // The person opens the code page while signed in, which ties the code to their session, then approves it.
  await call(`/device?user_code=${encodeURIComponent(code.user_code)}`, { headers: { cookie } });
  await auth.api.deviceApprove({ body: { userCode: code.user_code }, headers: new Headers({ cookie }) });
  const token = { grant_type: DEVICE_CODE_GRANT_TYPE, device_code: code.device_code, client_id: clientId };
  await call("/oauth2/token", form(token));
}

type WebApp = { clientId: string; secret: string; redirect: string };

// A web app's sign-in: authorize, the consent the person gives, then the code traded with the app's secret.
export async function webAppFlow(app: WebApp, cookie: string): Promise<void> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const query = new URLSearchParams({
    response_type: "code",
    client_id: app.clientId,
    redirect_uri: app.redirect,
    scope: SCOPES,
    state: randomBytes(8).toString("hex"),
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource: MCP_RESOURCE,
  });
  const asked = await call(`/oauth2/authorize?${query}`, { headers: { cookie }, redirect: "manual" });
  const consentUrl = new URL(asked.headers.get("location") ?? "", SERVER_URL);
  const consented = await call("/oauth2/consent", {
    method: "POST",
    // A browser sends the page's origin with the form, and better-auth refuses a consent without it.
    headers: { cookie, origin: SERVER_URL, "content-type": "application/json" },
    body: JSON.stringify({ accept: true, oauth_query: consentUrl.search.slice(1) }),
  });
  const { url } = (await consented.json()) as { url: string };
  const code = new URL(url).searchParams.get("code") ?? "";
  const basic = Buffer.from(`${app.clientId}:${app.secret}`).toString("base64");
  const exchange = form({
    grant_type: "authorization_code",
    code,
    redirect_uri: app.redirect,
    code_verifier: verifier,
    resource: MCP_RESOURCE,
  });
  await call("/oauth2/token", {
    ...exchange,
    headers: { ...exchange.headers, authorization: `Basic ${basic}` },
  });
}
