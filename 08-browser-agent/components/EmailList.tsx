import Link from "next/link";
import type { InboxRow } from "../rules/run";
import type { View } from "../rules/team";
import { StatusChip } from "./StatusChip";
import { when } from "./when";

type Props = { emails: InboxRow[]; view: View; selected: string | null };

const href = (view: View, id: string) => (view === "inbox" ? `/?email=${id}` : `/?view=${view}&email=${id}`);

// The left pane: one row per email, newest first. The open email is marked, so the pane on the right is never a surprise.
export function EmailList({ emails, view, selected }: Props) {
  return (
    <ul className="mail-list" aria-label="Emails">
      {emails.map((email) => (
        <li key={email.id}>
          <Link
            href={href(view, email.id)}
            className="mail-row"
            aria-current={email.id === selected ? "true" : undefined}
          >
            <span className="mail-row-top">
              <span className="mail-from">{email.fromName}</span>
              <time className="mail-time" dateTime={new Date(email.receivedAt).toISOString()}>
                {when(email.receivedAt)}
              </time>
            </span>
            <span className="mail-subject">{email.subject}</span>
            <span className="mail-row-bottom">
              <span className="mail-snippet" aria-hidden="true">
                {email.body.replace(/\s+/g, " ")}
              </span>
              <StatusChip status={email.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
