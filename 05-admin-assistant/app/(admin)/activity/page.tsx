import { Sparkles, User } from "lucide-react";
import Link from "next/link";
import { latestChanges } from "../../../db/queries";
import { requireTeam } from "../../session";

const when = (date: Date) => `${new Date(date).toISOString().slice(0, 16).replace("T", " ")} UTC`;

// What a change was about: the code it named, or a link to the newsletter it touched.
function About({ detail }: { detail: unknown }) {
  const about = (detail ?? {}) as { code?: string; newsletterId?: number; subject?: string };
  if (about.code) return <code className="coupon-chip">{about.code}</code>;
  if (about.newsletterId) {
    return (
      <Link className="change-link" href={`/newsletters/${about.newsletterId}`}>
        {about.subject ?? "Open the newsletter"}
      </Link>
    );
  }
  if (about.subject) return <span className="change-link">{about.subject}</span>;
  return null;
}

function Who({ by, name }: { by: string; name: string | null }) {
  return by === "assistant" ? (
    <span className="pill pill-agent">
      <Sparkles aria-hidden="true" /> Assistant, for {name ?? "a removed account"}
    </span>
  ) : (
    <span className="pill pill-info">
      <User aria-hidden="true" /> {name ?? "A removed account"}
    </span>
  );
}

// Everything saved in the admin, by the assistant or by a person, newest first.
export default async function ActivityPage() {
  await requireTeam();
  const changes = await latestChanges(100);
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Activity</h1>
          <p>Every draft the assistant saved and every approval a person made.</p>
        </div>
      </header>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>What</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.id}>
                <td>{when(change.madeAt)}</td>
                <td>
                  <Who by={change.by} name={change.name} />
                </td>
                <td>
                  {change.action}
                  <About detail={change.detail} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {changes.length === 0 ? <p className="empty-state">Nothing has changed yet.</p> : null}
      </div>
    </>
  );
}
