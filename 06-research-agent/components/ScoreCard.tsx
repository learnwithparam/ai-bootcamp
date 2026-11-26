import type { Score } from "../rules/score";

// The lead score and each reason behind it. A reason names the claims it rests on, linked below.
export function ScoreCard({ score }: { score: Score }) {
  return (
    <section className="score-card" aria-label="Lead score">
      <p className="score-total">
        <strong>{score.total}</strong> of 100
      </p>
      <ul className="score-reasons">
        {score.reasons.map((reason) => (
          <li key={reason.why}>
            <span className="score-points">
              {reason.points} of {reason.max}
            </span>
            <span>{reason.why}</span>
            <span className="claim-refs">
              {reason.claimIds.map((id) => (
                <a key={id} href={`#${id}`} className="claim-ref">
                  {id}
                </a>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
