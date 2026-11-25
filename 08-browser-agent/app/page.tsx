import { Topbar } from "@bootcamp/auth/topbar";
import { InboxList } from "../components/InboxList";
import { Refresher } from "../components/Refresher";
import { failStalled, inbox } from "../db/queries";
import { ACTIVE } from "../rules/run";
import { start } from "./actions";
import { requireOperator } from "./session";

// The firm's inbox: each client email, and what the agent did with it.
export default async function InboxPage() {
  const operator = await requireOperator();
  await failStalled();
  const emails = await inbox();
  return (
    <div className="app">
      <Topbar title="Browser agent" userName={operator.name} />
      <main className="desk">
        <h1>Client emails</h1>
        <p className="intro">
          The agent turns each email into a request on the firm's intake portal. You watch it work, and it
          sends nothing until code and the decision model agree.
        </p>
        <InboxList emails={emails} start={start} />
        {emails.some((email) => email.status && ACTIVE.includes(email.status)) ? <Refresher /> : null}
      </main>
    </div>
  );
}
