import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../../auth/auth";

// Sign-in, the OAuth endpoints (/oauth2/authorize, /oauth2/token) and the device flow land here.
export const { GET, POST } = toNextJsHandler(auth);
