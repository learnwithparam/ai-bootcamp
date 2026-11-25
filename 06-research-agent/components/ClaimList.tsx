import type { CheckedClaim } from "../rules/claims";
import { TOPICS } from "../rules/topics";

const CHECK_LABEL = {
  found: "Quote found on the page",
  missing: "Quote not on the page",
  unreadable: "Page could not be read",
};

function ClaimItem({ claim }: { claim: CheckedClaim }) {
  const host = new URL(claim.sourceUrl).hostname.replace(/^www\./, "");
  return (
    <li id={claim.id} className="claim">
      <p className="claim-text">{claim.text}</p>
      <blockquote className="claim-quote">{claim.quote}</blockquote>
      <p className="claim-meta">
        <a href={claim.sourceUrl} target="_blank" rel="noreferrer noopener">
          {host}
        </a>
        <span className="claim-id">{claim.id}</span>
      </p>
    </li>
  );
}

// Kept claims, grouped by topic. Claims whose quote was not found are listed apart, so you can see what was left out.
export function ClaimList({ claims }: { claims: CheckedClaim[] }) {
  const kept = claims.filter((claim) => claim.check === "found");
  const dropped = claims.filter((claim) => claim.check !== "found");
  return (
    <>
      {TOPICS.map((topic) => {
        const mine = kept.filter((claim) => claim.topic === topic.id);
        return (
          <section key={topic.id} className="topic">
            <h2>{topic.title}</h2>
            {mine.length === 0 ? <p className="empty">Nothing on this topic passed the check.</p> : null}
            <ul className="claims">
              {mine.map((claim) => (
                <ClaimItem key={claim.id} claim={claim} />
              ))}
            </ul>
          </section>
        );
      })}
      {dropped.length > 0 ? (
        <details className="dropped">
          <summary>Left out: {dropped.length} claims failed the check</summary>
          <ul className="claims">
            {dropped.map((claim) => (
              <li key={claim.id} className="claim">
                <p className="claim-text">{claim.text}</p>
                <span className="status status-fail">{CHECK_LABEL[claim.check]}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
