import { Mail } from "lucide-react";
import Link from "next/link";
import { AskButton } from "../../../components/AskButton";
import { newsletterList } from "../../../db/newsletters";
import { requireTeam } from "../../session";

const when = (date: Date) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

type Letter = Awaited<ReturnType<typeof newsletterList>>[number];

function Status({ letter }: { letter: Letter }) {
  if (letter.status === "approved") return <span className="pill pill-pass">Approved</span>;
  if (letter.previousBody) return <span className="pill pill-agent">Edited by the assistant</span>;
  return <span className="pill pill-wait">Draft</span>;
}

function LetterTable({ letters }: { letters: Letter[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {letters.map((letter) => (
            <tr key={letter.id}>
              <td>
                <Link className="row-link" href={`/newsletters/${letter.id}`}>
                  {letter.subject}
                </Link>
              </td>
              <td>
                <Status letter={letter} />
              </td>
              <td>{when(letter.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {letters.length === 0 ? (
        <p className="empty-state">
          <Mail aria-hidden="true" /> No issues yet. Ask the assistant to draft one.
        </p>
      ) : null}
    </div>
  );
}

// Every issue, newest first. Nothing here sends mail: an approved issue is copied into the mail tool by a person.
export default async function Newsletters() {
  await requireTeam();
  const letters = await newsletterList();
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Newsletters</h1>
          <p>
            The assistant writes drafts from what is new on the site. An owner reads and approves each one.
          </p>
        </div>
        <AskButton
          prompt="Draft this week's newsletter."
          label="Draft an issue"
          className="button page-actions"
        />
      </header>
      <LetterTable letters={letters} />
    </>
  );
}
