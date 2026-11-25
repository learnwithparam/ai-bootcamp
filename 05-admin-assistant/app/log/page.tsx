import { Topbar } from "@bootcamp/auth/topbar";
import Link from "next/link";
import { latestChanges, latestDrafts } from "../../db/queries";
import type { Change, Draft } from "../../db/schema";
import { requireOwner } from "../session";

const when = (date: Date) => `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;

function DraftList({ drafts }: { drafts: Draft[] }) {
  return (
    <>
      <h1>Newsletter drafts</h1>
      <p className="hint">Read a draft, then send it from your mail tool. The assistant never sends email.</p>
      {drafts.length === 0 ? (
        <p className="hint">No drafts yet. Ask the chat to draft the newsletter.</p>
      ) : null}
      <ul className="log">
        {drafts.map((draft) => (
          <li className="card" key={draft.id}>
            <details>
              <summary className="card-head">
                <span className="label">Draft {draft.id}</span>
                <span>{draft.subject}</span>
                <span className="hint">{when(draft.createdAt)}</span>
              </summary>
              <pre className="card-body draft-body">{draft.body}</pre>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}

function ChangeTable({ changes }: { changes: Change[] }) {
  return (
    <>
      <h1>Changes</h1>
      <p className="hint">Every change the assistant made, with what it was asked and what came back.</p>
      {changes.length === 0 ? <p className="hint">No changes yet.</p> : null}
      <table className="changes">
        <tbody>
          {changes.map((change) => (
            <tr key={change.id}>
              <td>{when(change.madeAt)}</td>
              <td>{change.tool}</td>
              <td>
                <code>{JSON.stringify(change.input)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// What the assistant wrote and changed, newest first. The chat can be closed; this record stays.
export default async function LogPage() {
  const owner = await requireOwner();
  const [drafts, changes] = await Promise.all([latestDrafts(20), latestChanges(50)]);
  return (
    <div className="app">
      <Topbar title="Admin assistant" userName={owner.name}>
        <Link href="/" className="link-button">
          Back to the chat
        </Link>
      </Topbar>
      <main className="queue">
        <DraftList drafts={drafts} />
        <ChangeTable changes={changes} />
      </main>
    </div>
  );
}
