"use client";

import { SignInForm } from "@bootcamp/auth/sign-in-form";
import { oauthClient } from "../../auth/client";

export function SignIn({ next }: { next: string | null }) {
  return <SignInForm client={oauthClient} next={next} />;
}
