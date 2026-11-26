import Link from "next/link";
import type { Member } from "../app/session";
import type { Report } from "../rules/report";
import type { Person } from "../rules/team";
import { TOPICS } from "../rules/topics";
import { OwnerCell } from "./OwnerCell";
import { ScoreCell } from "./ScoreCell";
import { hostOf, TopicCell } from "./TopicCell";

type Props = { reports: Report[]; member: Member; people: Pick<Person, "id" | "name">[] };

function CompanyCell({ report }: { report: Report }) {
  const sub = report.identity
    ? hostOf(report.identity.website)
    : report.status === "failed"
      ? (report.error ?? "Not found")
      : "Finding the company";
  return (
    <th scope="row" className="company-cell">
      <Link href={`/accounts/${report.id}`} className="row-link">
        {report.identity?.name ?? report.company}
      </Link>
      <span className={report.status === "failed" ? "cell-sub cell-error" : "cell-sub"}>{sub}</span>
    </th>
  );
}

function Head() {
  return (
    <thead>
      <tr>
        <th scope="col" className="company-cell">
          Company
        </th>
        <th scope="col">Owner</th>
        {TOPICS.map((topic) => (
          <th key={topic.id} scope="col">
            {topic.title}
          </th>
        ))}
        <th scope="col" className="num">
          Lead score
        </th>
      </tr>
    </thead>
  );
}

function Row({ report, member, people }: Omit<Props, "reports"> & { report: Report }) {
  return (
    <tr aria-busy={report.status === "running"}>
      <CompanyCell report={report} />
      <td>
        <OwnerCell report={report} member={member} people={people} />
      </td>
      {TOPICS.map((topic) => (
        <td key={topic.id} className="topic-cell">
          <TopicCell report={report} topic={topic} />
        </td>
      ))}
      <td className="num">
        <ScoreCell report={report} />
      </td>
    </tr>
  );
}

// The team's accounts. One row per company, one column per research question, filled by its own researcher.
export function AccountTable({ reports, member, people }: Props) {
  return (
    <div className="table-wrap accounts-wrap">
      <table className="table accounts">
        <Head />
        <tbody>
          {reports.map((report) => (
            <Row key={report.id} report={report} member={member} people={people} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
