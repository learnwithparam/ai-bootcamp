"use client";

import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";

// The browser side of sign-in for the MCP server. oauthProviderClient sends the signed OAuth request along with
// sign-in and consent, so after either one the browser goes straight back to Claude, Cursor or the CLI.
export const oauthClient = createAuthClient({ plugins: [oauthProviderClient()] });
