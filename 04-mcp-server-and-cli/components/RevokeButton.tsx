"use client";

import { useState, useTransition } from "react";
import { revoke } from "../app/apps/actions";

type Question = {
  name: string;
  pending: boolean;
  error: string | null;
  onRevoke: () => void;
  onKeep: () => void;
};

function AskFirst({ name, pending, error, onRevoke, onKeep }: Question) {
  return (
    <span className="revoke-confirm">
      <span>Disconnect {name}?</span>
      <button type="button" className="button button-danger" disabled={pending} onClick={onRevoke}>
        {pending ? "Revoking" : "Revoke access"}
      </button>
      <button type="button" className="button button-quiet" onClick={onKeep} disabled={pending}>
        Keep it
      </button>
      {error ? (
        <span className="result-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

// Revoking asks once, in place. The app's next call to /mcp is refused, and it must ask to sign in again.
export function RevokeButton({ clientId, name }: { clientId: string; name: string }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!asking)
    return (
      <button type="button" className="button button-quiet" onClick={() => setAsking(true)}>
        Revoke
      </button>
    );
  return (
    <AskFirst
      name={name}
      pending={pending}
      error={error}
      onKeep={() => setAsking(false)}
      onRevoke={() =>
        start(async () => {
          const result = await revoke(clientId);
          if (result.error) setError(result.error);
        })
      }
    />
  );
}
