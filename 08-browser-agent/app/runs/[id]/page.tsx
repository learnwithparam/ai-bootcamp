import Link from "next/link";
import { notFound } from "next/navigation";
import { PORTAL } from "../../../agent/portal";
import { BrowserView } from "../../../components/BrowserView";
import { Checkpoint } from "../../../components/Checkpoint";
import { DeskShell } from "../../../components/DeskShell";
import { Outcome } from "../../../components/Outcome";
import { Refresher } from "../../../components/Refresher";
import { RunControls } from "../../../components/RunControls";
import { RunPlan } from "../../../components/RunPlan";
import { when } from "../../../components/when";
import { emailById, failStalled, inbox, runById } from "../../../db/queries";
import { ACTIVE } from "../../../rules/run";
import { counts, VIEWS, viewOfStatus } from "../../../rules/team";
import { approve, stop, takeOver } from "../../actions";
import { requireOperator } from "../../session";

// One run, live: the agent's browser on the left; on the right the checkpoint, the controls and the activity log.
export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const person = await requireOperator();
  await failStalled();
  const run = await runById((await params).id);
  const email = run ? await emailById(run.emailId) : null;
  if (!run || !email) notFound();
  const view = viewOfStatus(run.status);
  return (
    <DeskShell person={person} current={view} counts={counts(await inbox())}>
      {ACTIVE.includes(run.status) ? <Refresher /> : null}
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href={view === "inbox" ? "/" : `/?view=${view}&email=${email.id}`}>{VIEWS[view]}</Link> /{" "}
        {email.subject}
      </nav>
      <header className="page-header">
        <div>
          <h1>{email.subject}</h1>
          <p>
            From {email.fromName}, run started {when(run.createdAt)}
          </p>
        </div>
        <RunControls run={run} stop={stop} takeOver={takeOver} />
      </header>
      <div className="run-split">
        <BrowserView run={run} portal={PORTAL} />
        <div className="run-side">
          {run.status === "waiting" ? <Checkpoint run={run} role={person.role} approve={approve} /> : null}
          {run.finishedAt ? <Outcome run={run} portal={PORTAL} /> : null}
          <RunPlan run={run} />
          <details className="panel email">
            <summary className="panel-head">The email from {email.fromName}</summary>
            <p className="panel-body">{email.body}</p>
          </details>
        </div>
      </div>
    </DeskShell>
  );
}
