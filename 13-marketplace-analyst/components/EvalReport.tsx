import { BARS, meets } from "../rules/bars";
import type { CaseDetail, CaseScores, RunSummary } from "../rules/eval-types";

// Each metric against its bar, then every case with what the judge saw, so a score can be checked.

function shown(metric: string, score: number): string {
  if (metric === "costUsd") return `US$${score.toFixed(4)}`;
  return metric === "privacyLeaks" ? String(score) : `${Math.round(score * 100)}%`;
}

// Where the fill ends and the bar sits, as shares of the track. A "no more than" bar sits half way.
function drawn({ bar, atMost }: (typeof BARS)[number], score: number) {
  if (!atMost) return { share: score, mark: bar };
  return { share: bar ? Math.min(score / (bar * 2), 1) : Math.min(score, 1), mark: bar ? 0.5 : 0 };
}

function Score({ bar, score }: { bar: (typeof BARS)[number]; score: number }) {
  const ok = meets(bar, score);
  const { share, mark } = drawn(bar, score);
  return (
    <li>
      <span className="score-name">
        {bar.label}
        <span>{bar.asks}</span>
      </span>
      <span className="score-track" aria-hidden="true">
        <span className={ok ? "score-fill" : "score-fill score-under"} style={{ width: `${share * 100}%` }} />
        <span className="score-bar" style={{ left: `${mark * 100}%` }} />
      </span>
      <strong>{shown(bar.metric, score)}</strong>
      <span className={ok ? "status status-pass" : "status status-wait"}>
        {ok ? "meets" : "misses"} {bar.atMost ? "at most " : "at least "}
        {shown(bar.metric, bar.bar)}
      </span>
    </li>
  );
}

export function Scorecard({ summary }: { summary: RunSummary }) {
  return (
    <ul className="scores">
      {BARS.map((bar) => (
        <Score key={bar.metric} bar={bar} score={summary[bar.metric]} />
      ))}
    </ul>
  );
}

type Result = { caseId: string; question: string; passed: boolean; scores: CaseScores; detail: CaseDetail };

function Claims({ claims }: { claims: CaseDetail["claims"] }) {
  if (!claims.length) return null;
  return (
    <>
      <h2>Claims the judge checked</h2>
      <ul className="claims">
        {claims.map((claim, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a judge may write the same claim twice
          <li key={i}>
            <span className={claim.supported ? "status status-pass" : "status status-wait"}>
              {claim.supported ? "supported" : "not supported"}
            </span>
            <span>
              {claim.claim}
              <span className="cell-sub">{claim.why}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Written({ written }: { written: CaseDetail["written"] }) {
  if (!written.length) return null;
  return (
    <>
      <h2>Questions the judge wrote back from the answer</h2>
      <ul>
        {written.map(({ question, similarity }, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a judge may write the same question twice
          <li key={i}>
            {question} ({Math.round(similarity * 100)}% alike)
          </li>
        ))}
      </ul>
    </>
  );
}

function Detail({ detail }: { detail: CaseDetail }) {
  const { described, needed } = detail.tables;
  return (
    <div className="case-detail">
      {detail.problems.map((problem) => (
        <p key={problem} className="form-error">
          {problem}
        </p>
      ))}
      <h2>Answer</h2>
      <p className="eval-answer">{detail.answer.replace(/^- /gm, "• ")}</p>
      {detail.template ? <h2>The answer with its slots</h2> : null}
      {detail.template ? <pre>{detail.template}</pre> : null}
      {needed.length ? (
        <p>
          Tables described: {described.join(", ") || "none"}. Tables needed: {needed.join(", ")}.
        </p>
      ) : null}
      <Claims claims={detail.claims} />
      <Written written={detail.written} />
      {detail.evidence ? (
        <details>
          <summary>What the judge was given, with no row in it</summary>
          <pre>{detail.evidence}</pre>
        </details>
      ) : null}
    </div>
  );
}

export function EvalCases({ results }: { results: Result[] }) {
  // Failures first: they are what someone came to read.
  const ordered = [...results].sort((a, b) => Number(a.passed) - Number(b.passed));
  return (
    <ul className="cases">
      {ordered.map((result) => (
        <li key={result.caseId}>
          <details>
            <summary>
              <span className={result.passed ? "status status-pass" : "status status-wait"}>
                {result.passed ? "passed" : "failed"}
              </span>
              <span>{result.question}</span>
              <span className="case-route">{result.detail.route.replace(/_/g, " ")}</span>
            </summary>
            <Detail detail={result.detail} />
          </details>
        </li>
      ))}
    </ul>
  );
}
