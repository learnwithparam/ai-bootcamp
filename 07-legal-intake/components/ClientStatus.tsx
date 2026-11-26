import { Check } from "lucide-react";
import type { Intake } from "../rules/intake";

// What the client sees on their private link: where their request is, what they sent, and the letter once
// a lawyer approves it. Never the model's assessment, the conflict check or the draft.

const STAGES = ["Received", "A lawyer is reviewing it", "Our reply is ready"];

function stageOf(intake: Intake): number {
  if (intake.status === "answered") return 2;
  return intake.status === "assessing" ? 0 : 1;
}

function Tracker({ intake }: { intake: Intake }) {
  const at = stageOf(intake);
  return (
    <ol className="tracker" aria-label="Where your request is">
      {STAGES.map((stage, index) => (
        <li
          key={stage}
          className={index < at ? "done" : index === at ? "now" : ""}
          aria-current={index === at ? "step" : undefined}
        >
          <span className="tracker-dot">{index < at || at === 2 ? <Check aria-hidden="true" /> : null}</span>
          {stage}
        </li>
      ))}
    </ol>
  );
}

function WhatYouSent({ intake }: { intake: Intake }) {
  return (
    <section className="panel">
      <h2 className="panel-head">What you sent us</h2>
      <dl className="facts panel-body">
        <dt>Name</dt>
        <dd>{intake.clientName}</dd>
        <dt>Reply to</dt>
        <dd>{intake.clientEmail}</dd>
        <dt>The other side</dt>
        <dd>{intake.otherParties.join(", ")}</dd>
        {intake.keyDate ? (
          <>
            <dt>Date that matters</dt>
            <dd>{intake.keyDate.date}</dd>
          </>
        ) : null}
        <dt>What you want</dt>
        <dd>{intake.goal}</dd>
      </dl>
    </section>
  );
}

export function ClientStatus({ intake }: { intake: Intake }) {
  const answered = intake.status === "answered" && intake.letter;
  return (
    <div className="client-status">
      <Tracker intake={intake} />
      {answered ? (
        <article className="letter" aria-label="Our reply">
          <p className="letter-date">Sent {intake.answeredAt?.toISOString().slice(0, 10)}</p>
          <div className="letter-body">{intake.letter}</div>
        </article>
      ) : (
        <p className="client-wait">
          We have your request from {intake.createdAt.toISOString().slice(0, 10)}. A lawyer reads every
          request before we reply. Keep this page: our reply appears here.
        </p>
      )}
      <WhatYouSent intake={intake} />
    </div>
  );
}
