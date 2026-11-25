"use client";

import { createAuthClient } from "better-auth/react";

// The browser side of sign-in. It talks to the product's own /api/auth route.
export const authClient = createAuthClient();
