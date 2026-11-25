import { Topbar } from "@bootcamp/auth/topbar";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PORTAL } from "../../../agent/portal";
import { ActionButton } from "../../../components/ActionButton";
import { BrowserView } from "../../../components/BrowserView";
import { Refresher } from "../../../components/Refresher";
import { RunPlan } from "../../../components/RunPlan";
import { emailById, failStalled, runById } from "../../../db/queries";
import { ACTIVE } from "../../../rules/run";
import { approve, stop } from "../../actions";
import { requireOperator } from "../../session";

// One run: the browser on the left, the plan and the log on the right, and the person's buttons when it waits.
export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const operator = await requireOperator();
  await failStalled();
  const run = await runById((await params).id);
  const email = run ? await emailById(run.emailId) : null;
  if (!run || !email) notFound();
  return (
    <div className="app">
      <Topbar title="Browser agent" userName={operator.name} />
      <main className="run">
        <Link href="/" className="back">
          Client emails
        </Link>
        <h1>{email.subject}</h1>
        <div className="run-split">
          <BrowserView run={run} portal={PORTAL} />
          <section className="run-side" aria-label="What the agent is doing">
            <RunPlan run={run} />
            {run.status === "waiting" ? (
              <div className="run-actions">
                <ActionButton action={approve} name="runId" value={run.id} label="Approve and send" primary />
                <ActionButton action={stop} name="runId" value={run.id} label="Stop, do not send" />
              </div>
            ) : null}
            {run.requestUrl ? (
              <a href={run.requestUrl} target="_blank" rel="noreferrer" className="sent-link">
                Open the request on the portal
              </a>
            ) : null}
            <details className="email">
              <summary>The email from {email.fromName}</summary>
              <p>{email.body}</p>
            </details>
          </section>
        </div>
        {ACTIVE.includes(run.status) ? <Refresher /> : null}
      </main>
    </div>
  );
}
