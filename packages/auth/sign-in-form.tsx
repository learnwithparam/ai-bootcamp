"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "./client";

type Client = Pick<typeof authClient, "signIn" | "signUp">;

// Real accounts: the password is hashed and the session is kept in Postgres. One account works in every product.
// A product can pass its own client (the MCP server's continues an OAuth sign-in by itself, so it passes next={null})
// and the page to open once signed in.
export function SignInForm({ client = authClient, next = "/" }: { client?: Client; next?: string | null }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function submit(form: FormData) {
    const failed = await sendToAuth(client, form, creating);
    if (failed) return setError(failed);
    if (next) router.push(next);
  }

  return (
    <form action={submit} className="sign-in-form">
      <Fields creating={creating} />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="button button-primary">
        {creating ? "Create account" : "Sign in"}
      </button>
      <button type="button" className="link-button" onClick={() => setCreating(!creating)}>
        {creating ? "I have an account" : "Create an account"}
      </button>
    </form>
  );
}

// Returns the reason sign-in failed, or an empty string when it worked.
async function sendToAuth(client: Client, form: FormData, creating: boolean): Promise<string> {
  const email = String(form.get("email"));
  const password = String(form.get("password"));
  const result = creating
    ? await client.signUp.email({ name: String(form.get("name")), email, password })
    : await client.signIn.email({ email, password });
  return result.error ? (result.error.message ?? "Sign-in failed.") : "";
}

function Fields({ creating }: { creating: boolean }) {
  return (
    <>
      {creating ? (
        <label className="form-row">
          Your name
          <input name="name" className="field" required autoComplete="name" />
        </label>
      ) : null}
      <label className="form-row">
        Email
        <input name="email" type="email" className="field" required autoComplete="email" />
      </label>
      <label className="form-row">
        Password
        <input
          name="password"
          type="password"
          className="field"
          required
          minLength={10}
          aria-describedby={creating ? "password-hint" : undefined}
          autoComplete={creating ? "new-password" : "current-password"}
        />
        {creating ? (
          <span className="form-hint" id="password-hint">
            At least 10 characters.
          </span>
        ) : null}
      </label>
    </>
  );
}
