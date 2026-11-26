"use client";

import { useActionState } from "react";
import { type ReplyState, sendReply } from "../app/inbox/actions";

const START: ReplyState = { error: null, draft: "", sent: 0 };

// The teammate's reply goes into the visitor's messenger, under the teammate's own name.
export function ReplyBox({ conversationId, visitor }: { conversationId: string; visitor: string }) {
  const [state, action, pending] = useActionState(sendReply, START);
  return (
    <form action={action} className="reply-box">
      <input type="hidden" name="conversation" value={conversationId} />
      <label htmlFor="reply" className="sr-only">
        Reply to {visitor}
      </label>
      <textarea
        id="reply"
        className="field"
        name="reply"
        rows={3}
        required
        defaultValue={state.draft}
        placeholder={`Reply to ${visitor}. They see it in the messenger.`}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "reply-error" : undefined}
      />
      <div className="reply-actions">
        {state.error ? (
          <p id="reply-error" className="field-error" role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" className="button button-primary" disabled={pending}>
          {pending ? "Sending..." : "Send reply"}
        </button>
      </div>
    </form>
  );
}
