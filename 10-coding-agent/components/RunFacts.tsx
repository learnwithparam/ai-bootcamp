import { duration, money } from "@bootcamp/coding-harness/rules/labels";
import type { RunDetail } from "../rules/run";
import { when } from "./when";

// The numbers a reviewer checks first: where it ran, who ran it, how long, how much, and what was refused.
export function RunFacts({ run }: { run: RunDetail }) {
  const facts: [string, string][] = [
    ["Repo", `${run.repo} at ${run.commit.slice(0, 8)}`],
    ["Run by", `${run.author}, sent ${when(run.uploadedAt)}`],
    ["Took", `${run.steps} steps in ${duration(run.startedAt, run.finishedAt)}`],
    ["Cost", money(run.cost)],
    [
      "Refused",
      run.blocked
        ? `${run.blocked} ${run.blocked === 1 ? "action" : "actions"} by the harness rules`
        : "Nothing",
    ],
  ];
  return (
    <dl className="facts run-facts">
      {facts.map(([term, value]) => (
        <div key={term} className="run-fact">
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
