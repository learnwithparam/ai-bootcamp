import type { Intake } from "../rules/intake";

// What the client sees on their private link: that we have it, and the lawyer's letter once it is approved.
// Never the model's assessment, the conflict check or the draft.
export function ClientStatus({ intake }: { intake: Intake }) {
  if (intake.status === "answered" && intake.letter) {
    return (
      <article className="letter" aria-label="Our reply">
        <p className="letter-date">Sent {intake.answeredAt?.toISOString().slice(0, 10)}</p>
        <div className="letter-body">{intake.letter}</div>
      </article>
    );
  }
  if (intake.status === "failed") {
    return (
      <p className="form-error">
        Something went wrong on our side. Your request is saved and our team can see it.
      </p>
    );
  }
  return (
    <p className="client-wait">
      We have your request from {intake.createdAt.toISOString().slice(0, 10)}. A lawyer reads every request
      before we reply. Keep this page: the reply appears here.
    </p>
  );
}
