import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { oauthDeviceAuthorization } from "@better-auth/oauth-provider";
import { accountOptions } from "@bootcamp/auth";
import { required } from "@bootcamp/model";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";

// The same accounts as every product, plus an OAuth server, so Claude, Cursor and the CLI can act as you.
//   - Claude and Cursor find the sign-in page from /.well-known/oauth-protected-resource and sign in with PKCE.
//   - They identify themselves with a Client ID Metadata Document (cimd), so nobody registers a client by hand.
//   - The CLI has no browser of its own, so it uses the device flow: you type a short code on /device.
// Every access token is a signed JWT for one audience: this server's /mcp address.

export const SERVER_URL = required("MCP_SERVER_URL");
export const MCP_RESOURCE = `${SERVER_URL}/mcp`;
export const SCOPES = "openid profile email offline_access";

export const auth = betterAuth({
  ...accountOptions,
  baseURL: SERVER_URL,
  // The JWT plugin's /token route hands out session JWTs signed with the same key. Only OAuth tokens are wanted.
  disabledPaths: ["/token"],
  plugins: [
    jwt({ disableSettingJwtHeader: true }),
    mcp({
      loginPage: "/sign-in",
      consentPage: "/consent",
      resource: MCP_RESOURCE,
      refreshTokenReuseInterval: 0,
      // A web app on this laptop, like the team workspace, gets people back on plain http. Anywhere else needs https.
      allowInsecureRedirectUri: (url: URL) => ["localhost", "127.0.0.1"].includes(url.hostname),
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
    oauthDeviceAuthorization({ verificationUri: "/device" }),
    nextCookies(),
  ],
});
