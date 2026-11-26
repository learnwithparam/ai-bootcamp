import { Bot, MonitorPlay } from "lucide-react";
import Link from "next/link";
import type { InboxRow } from "../rules/run";
import { ActionButton, type ActionState } from "./ActionButton";
import { StatusChip } from "./StatusChip";
import { when } from "./when";

type Start = (previous: ActionState, form: FormData) => Promise<ActionState>;

const STARTABLE = [null, "failed", "stopped"];

// The right pane: the email as it arrived, and the one thing to do with it next.
export function EmailPreview({ email, start }: { email: InboxRow; start: Start }) {
  return (
    <article className="mail-open" aria-label={`Email from ${email.fromName}`}>
      <header className="mail-open-head">
        <h2>{email.subject}</h2>
        <p>
          <strong>{email.fromName}</strong> &lt;{email.fromEmail}&gt;
          <span className="mail-time"> {when(email.receivedAt)}</span>
        </p>
      </header>
      <div className="mail-body">{email.body}</div>
      <footer className="mail-next">
        {email.status ? <StatusChip status={email.status} /> : null}
        {email.runId ? (
          <Link href={`/runs/${email.runId}`} className="button">
            <MonitorPlay aria-hidden="true" /> Open the run
          </Link>
        ) : null}
        {STARTABLE.includes(email.status) ? (
          <>
            <ActionButton
              action={start}
              name="emailId"
              value={email.id}
              label={email.status ? "Run the agent again" : "Run the agent"}
              icon={<Bot aria-hidden="true" />}
              primary
            />
            <p className="mail-next-hint">
              The agent opens the firm's intake portal in its own browser and fills in the request. You can
              stop it or take it over at any step.
            </p>
          </>
        ) : null}
      </footer>
    </article>
  );
}
