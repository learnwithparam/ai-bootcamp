import { Topbar } from "@bootcamp/auth/topbar";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IntakeView } from "../../../components/IntakeView";
import { Refresher } from "../../../components/Refresher";
import { DecisionForm, LetterForm, RetryForm } from "../../../components/ReviewForm";
import { RUNNING } from "../../../components/StatusChip";
import { intakeById } from "../../../db/queries";
import { requireLawyer } from "../../session";
import { approve, decide, retry } from "../actions";

// One request. The form shown depends on where the graph is waiting: a decision, or a letter to approve.
export default async function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const lawyer = await requireLawyer();
  const { id } = await params;
  const intake = await intakeById(id);
  if (!intake) notFound();
  const possible = intake.conflicts.some((conflict) => conflict.match === "possible");
  return (
    <div className="app">
      <Topbar title="Legal intake" userName={lawyer.name} />
      <main className="desk">
        <Link href="/queue" className="back">
          Review queue
        </Link>
        <IntakeView intake={intake} />
        {intake.status === "needs review" ? (
          <DecisionForm id={id} action={decide} possible={possible} />
        ) : null}
        {intake.status === "letter ready" && intake.draft ? (
          <LetterForm id={id} draft={intake.draft} action={approve} />
        ) : null}
        {intake.status === "failed" ? <RetryForm id={id} action={retry} /> : null}
        {intake.letter ? (
          <article className="letter" aria-label="Letter sent">
            <div className="letter-body">{intake.letter}</div>
          </article>
        ) : null}
        {RUNNING.includes(intake.status) ? <Refresher /> : null}
      </main>
    </div>
  );
}
