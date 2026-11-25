import { auth } from "@bootcamp/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Sign-in, sign-up and sign-out requests from the browser land here.
export const { GET, POST } = toNextJsHandler(auth);
