import { auth } from "../../../auth/auth";

// MCP clients look for /.well-known/oauth-protected-resource and /.well-known/oauth-authorization-server
// at the site's root. better-auth answers both; this route hands the request over.
export const GET = (request: Request) => auth.handler(request);
