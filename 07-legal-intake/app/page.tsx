import { Topbar } from "@bootcamp/auth/topbar";
import { IntakeForm } from "../components/IntakeForm";
import { sendRequest } from "./actions";

// The public page. Anyone can ask the firm for help, with no account.
export default function RequestPage() {
  return (
    <div className="app">
      <Topbar title="Legal intake" />
      <main className="desk">
        <div className="intro">
          <h1>Ask us for help</h1>
          <p>
            We take on employment, tenancy and consumer matters. Tell us what happened. A lawyer reads every
            request, and you get a private link where our reply appears.
          </p>
        </div>
        <IntakeForm action={sendRequest} />
      </main>
    </div>
  );
}
