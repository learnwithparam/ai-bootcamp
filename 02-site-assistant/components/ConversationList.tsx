import Link from "next/link";
import { type InboxRow, ownerName, previewOf, VIEWS, type View } from "../rules/conversation";
import { when } from "./when";

const who = (row: InboxRow) => row.name ?? row.email ?? "Guest";

function Row({ row, view, selected }: { row: InboxRow; view: View; selected: boolean }) {
  return (
    <Link
      href={`/inbox?view=${view}&id=${row.id}`}
      className="inbox-row"
      aria-current={selected ? "true" : undefined}
    >
      <span className="inbox-row-top">
        <strong>{who(row)}</strong>
        <time dateTime={row.updatedAt.toISOString()}>{when(row.updatedAt)}</time>
      </span>
      <span className="inbox-snippet">{previewOf(row)}</span>
      <span className={row.owner === "team" ? "owner-chip owner-chip-team" : "owner-chip"}>
        {row.closedAt ? "Closed" : ownerName(row)}
      </span>
    </Link>
  );
}

// One line per conversation: who wrote, their last words, when, and who has it now.
export function ConversationList({
  rows,
  view,
  selected,
}: {
  rows: InboxRow[];
  view: View;
  selected: string | null;
}) {
  if (rows.length === 0)
    return (
      <section className="inbox-list inbox-empty" aria-label={VIEWS[view]}>
        <p>
          Nothing here. New conversations land in "Waiting for a person" when the assistant passes one on.
        </p>
      </section>
    );
  return (
    <section className="inbox-list" aria-label={VIEWS[view]}>
      <h1 className="inbox-list-title">{VIEWS[view]}</h1>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <Row row={row} view={view} selected={row.id === selected} />
          </li>
        ))}
      </ul>
    </section>
  );
}
