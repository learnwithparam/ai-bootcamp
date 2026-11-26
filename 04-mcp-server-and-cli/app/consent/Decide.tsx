"use client";

import { useState } from "react";
import { oauthClient } from "../../auth/client";

// Allow or Deny. Either way the server sends the browser back to the app that asked.
export function Decide() {
  const [error, setError] = useState("");
  async function decide(accept: boolean) {
    const result = await oauthClient.oauth2.consent({ accept });
    if (result.error) setError(result.error.message ?? "That did not work. Start again from the app.");
  }
  return (
    <div className="grant-actions">
      <button type="button" className="button button-primary" onClick={() => decide(true)}>
        Allow
      </button>
      <button type="button" className="button button-quiet" onClick={() => decide(false)}>
        Deny
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
