import Link from "next/link";
import type { InboxRow } from "../rules/run";
import { ActionButton, type ActionState } from "./ActionButton";
import { StatusChip } from "./StatusChip";

type Start = (previous: ActionState, form: FormData) => Promise<ActionState>;

// One row per email. An email the agent has not touched gets a button; one it has links to its run.
export function InboxList({ emails, start }: { emails: InboxRow[]; start: Start }) {
  if (emails.length === 0)
    return <p className="empty">No emails yet. Load the sample inbox with bun run seed browser-agent.</p>;
  return (
    <ul className="inbox">
      {emails.map((email) => (
        <li key={email.id} className="inbox-row">
          <div className="inbox-text">
            <span className="inbox-from">{email.fromName}</span>
            <span className="inbox-subject">{email.subject}</span>
          </div>
          <StatusChip status={email.status} />
          {email.runId ? (
            <Link href={`/runs/${email.runId}`} className="button">
              Open the run
            </Link>
          ) : null}
          {email.status === null || email.status === "failed" || email.status === "stopped" ? (
            <ActionButton action={start} name="emailId" value={email.id} label="Run the agent" primary />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
