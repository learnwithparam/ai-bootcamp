import { Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskButton } from "../../../../components/AskButton";
import { DiffView } from "../../../../components/DiffView";
import { EmailPreview } from "../../../../components/EmailPreview";
import { newsletterById } from "../../../../db/newsletters";
import type { Newsletter } from "../../../../db/schema";
import { requireTeam } from "../../../session";
import { approveIssue, keepChange, saveIssue, undoChange } from "./actions";

function PendingChange({ letter }: { letter: Newsletter }) {
  return (
    <section className="panel agent-filled" aria-labelledby="change">
      <h2 className="panel-head" id="change">
        <Sparkles aria-hidden="true" /> The assistant changed this draft
      </h2>
      <div className="panel-body">
        {letter.previousSubject !== letter.subject ? (
          <p>
            Subject was: <del>{letter.previousSubject}</del>
          </p>
        ) : null}
        <DiffView before={letter.previousBody ?? ""} after={letter.body} />
        <div className="page-actions">
          <form action={undoChange}>
            <input type="hidden" name="id" value={letter.id} />
            <button type="submit" className="button button-quiet">
              Undo the change
            </button>
          </form>
          <form action={keepChange}>
            <input type="hidden" name="id" value={letter.id} />
            <button type="submit" className="button">
              Keep the change
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Editor({ letter }: { letter: Newsletter }) {
  return (
    <form action={saveIssue} className="panel">
      <h2 className="panel-head">Edit</h2>
      <div className="panel-body form-grid">
        <input type="hidden" name="id" value={letter.id} />
        <label className="form-row form-row-wide">
          Subject
          <input name="subject" defaultValue={letter.subject} required minLength={5} maxLength={80} />
        </label>
        <label className="form-row form-row-wide">
          Body
          <textarea name="body" defaultValue={letter.body} rows={18} required />
        </label>
        <button type="submit" className="button">
          Save my edit
        </button>
      </div>
    </form>
  );
}

function Actions({ draft, id, owner }: { draft: boolean; id: number; owner: boolean }) {
  if (!draft) return <span className="pill pill-pass">Approved</span>;
  return (
    <div className="page-actions">
      <AskButton
        prompt="Make this newsletter shorter and keep every link."
        label="Ask for an edit"
        className="button button-quiet"
      />
      {owner ? (
        <form action={approveIssue}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="button button-primary">
            Approve
          </button>
        </form>
      ) : (
        <span className="pill pill-wait">Only an owner approves</span>
      )}
    </div>
  );
}

export default async function NewsletterPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireTeam();
  const letter = await newsletterById(Number((await params).id));
  if (!letter) notFound();
  const draft = letter.status === "draft";
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/newsletters">Newsletters</Link>
      </nav>
      <header className="page-header">
        <div>
          <h1>{letter.subject}</h1>
          <p>
            {draft
              ? "A draft. Read the preview, then approve it to copy into the mail tool."
              : "Approved. Copy it into the mail tool to send."}
          </p>
        </div>
        <Actions draft={draft} id={letter.id} owner={member.role === "owner"} />
      </header>
      {draft && letter.previousBody !== null ? <PendingChange letter={letter} /> : null}
      <div className="newsletter-layout">
        <EmailPreview subject={letter.subject} body={letter.body} />
        {draft ? <Editor letter={letter} /> : null}
      </div>
    </>
  );
}
