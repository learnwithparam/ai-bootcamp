import { ExternalLink } from "lucide-react";
import { type CheckedClaim, keptClaims } from "../rules/claims";
import type { Report } from "../rules/report";
import type { Topic } from "../rules/topics";

export const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

// Every kept claim on one topic, each with its quote and a link to the page it was found on.
function Sources({
  id,
  company,
  topic,
  claims,
}: {
  id: string;
  company: string;
  topic: Topic;
  claims: CheckedClaim[];
}) {
  return (
    <div
      id={id}
      popover="auto"
      role="dialog"
      className="source-card"
      aria-label={`${company}, ${topic.title}: sources`}
    >
      <h2>
        {company}: {topic.title}
      </h2>
      <ul>
        {claims.map((claim) => (
          <li key={claim.id}>
            <p>{claim.text}</p>
            <blockquote>{claim.quote}</blockquote>
            <a href={claim.sourceUrl} target="_blank" rel="noreferrer noopener">
              {hostOf(claim.sourceUrl)} <ExternalLink aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// One research question for one account. It shows "Researching" until its researcher returns,
// then the first claim whose quote was found on its page, and a button that opens all of them.
export function TopicCell({ report, topic }: { report: Report; topic: Topic }) {
  if (report.status === "failed" && !report.topicsDone.includes(topic.id))
    return <span className="cell-none">Not researched</span>;
  if (!report.topicsDone.includes(topic.id)) return <span className="cell-running">Researching</span>;
  const mine = report.claims.filter((claim) => claim.topic === topic.id);
  const kept = keptClaims(mine);
  const [first] = kept;
  if (!first)
    return (
      <span className="cell-none">Nothing checked out{mine.length ? `, ${mine.length} left out` : ""}</span>
    );
  const id = `sources-${report.id}-${topic.id}`;
  return (
    <div className="cell-claim">
      <p>{first.text}</p>
      <button type="button" className="sources-button" popoverTarget={id}>
        {kept.length} source{kept.length === 1 ? "" : "s"}
        <span className="sr-only"> for {topic.title.toLowerCase()}</span>
      </button>
      <Sources id={id} company={report.identity?.name ?? report.company} topic={topic} claims={kept} />
    </div>
  );
}
