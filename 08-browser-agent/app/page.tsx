import { Inbox } from "lucide-react";
import { DeskShell } from "../components/DeskShell";
import { EmailList } from "../components/EmailList";
import { EmailPreview } from "../components/EmailPreview";
import { Refresher } from "../components/Refresher";
import { failStalled, inbox } from "../db/queries";
import { ACTIVE } from "../rules/run";
import { counts, inView, VIEWS, viewOf } from "../rules/team";
import { start } from "./actions";
import { requireOperator } from "./session";

const EMPTY = {
  inbox: "No new client emails. Every email has been through the agent.",
  approvals: "Nothing waits for approval.",
  working: "The agent is not working on any email right now.",
  sent: "No requests sent to the portal yet.",
  closed: "No stopped, taken over or failed runs.",
};

type Search = Promise<{ view?: string; email?: string }>;

// The firm's shared inbox: client emails on the left, the open one on the right.
export default async function InboxPage({ searchParams }: { searchParams: Search }) {
  const person = await requireOperator();
  await failStalled();
  const query = await searchParams;
  const view = viewOf(query.view);
  const all = await inbox();
  const emails = inView(all, view);
  const open = emails.find((email) => email.id === query.email) ?? emails[0] ?? null;
  return (
    <DeskShell person={person} current={view} counts={counts(all)}>
      {all.some((email) => email.status && ACTIVE.includes(email.status)) ? <Refresher /> : null}
      <header className="page-header">
        <div>
          <h1>{VIEWS[view]}</h1>
          <p>Client emails to the firm. The agent turns each one into a request on the intake portal.</p>
        </div>
      </header>
      {open ? (
        <div className="mail">
          <EmailList emails={emails} view={view} selected={open.id} />
          <EmailPreview email={open} start={start} />
        </div>
      ) : (
        <div className="table-wrap empty-state">
          <Inbox aria-hidden="true" />
          <p>{EMPTY[view]}</p>
        </div>
      )}
    </DeskShell>
  );
}
