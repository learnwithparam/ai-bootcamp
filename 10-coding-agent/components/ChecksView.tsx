import { checkWords } from "@bootcamp/coding-harness/rules/check";
import type { Check } from "@bootcamp/coding-harness/rules/session";
import { CircleCheck, CircleX } from "lucide-react";

// The same test command run twice: once before the agent changed anything, once when it said it was done.
export function ChecksView({
  command,
  before,
  after,
}: {
  command: string;
  before: Check | null;
  after: Check | null;
}) {
  return (
    <div className="checks">
      <p className="checks-command">
        Both runs used <code>{command}</code> in a clean copy of the repo.
      </p>
      <div className="checks-pair">
        <CheckCard title="Before the agent started" result={before} />
        <CheckCard title="After it said it was done" result={after} />
      </div>
    </div>
  );
}

function CheckCard({ title, result }: { title: string; result: Check | null }) {
  if (!result) {
    return (
      <section className="panel check-card">
        <h2>{title}</h2>
        <p className="cell-sub">The agent stopped before this check ran.</p>
      </section>
    );
  }
  const Icon = result.passed ? CircleCheck : CircleX;
  return (
    <section className={`panel check-card ${result.passed ? "check-card-pass" : "check-card-fail"}`}>
      <h2>
        <Icon aria-hidden="true" /> {title}
      </h2>
      <p className="check-card-count">{checkWords(result)}</p>
      {result.failures.length > 0 && (
        <ul className="check-failures">
          {result.failures.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
      <details>
        <summary>Show the test output</summary>
        <pre className="replay-output">{result.output}</pre>
      </details>
    </section>
  );
}
