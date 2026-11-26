import type { Item } from "@bootcamp/catalog";
import { CalendarDays, CircleAlert, CircleCheck, Clock } from "lucide-react";
import { dateWords } from "../rules/plain";

export type Outcome = { ok: boolean; body: Record<string, unknown> };

const KIND_WORDS: Record<Item["kind"], string> = {
  upcoming: "Upcoming lab",
  lab: "Past lab",
  course: "Video course",
  lightning: "Lightning session",
  post: "Blog post",
  newsletter: "Newsletter",
  playbook: "Playbook",
  ebook: "Ebook",
};

function ItemList({ items, empty }: { items: Item[]; empty: string }) {
  if (!items.length) return <p className="result-empty">{empty}</p>;
  return (
    <ul className="result-items">
      {items.map((item) => (
        <li key={item.url} className="result-item">
          <span className="pill pill-info">{KIND_WORDS[item.kind]}</span>
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
          {item.summary ? <p>{item.summary}</p> : null}
          {item.date || item.duration ? (
            <span className="cell-sub">
              {item.date ? (
                <>
                  <CalendarDays aria-hidden="true" /> {dateWords(item.date)}
                </>
              ) : null}
              {item.duration ? (
                <>
                  <Clock aria-hidden="true" /> {item.duration}
                </>
              ) : null}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// What a tool returned, drawn the way a person reads it. The raw JSON is one click away.
export function ToolResult({ outcome }: { outcome: Outcome }) {
  const { ok, body } = outcome;
  if (!ok)
    return (
      <p className="result-error" role="alert">
        <CircleAlert aria-hidden="true" /> {String(body.error ?? "The tool failed.")}
      </p>
    );
  if (typeof body.saved === "string")
    return (
      <p className="result-saved" role="status">
        <CircleCheck aria-hidden="true" /> Saved “{body.saved}” to your list.
      </p>
    );
  if (Array.isArray(body.sessions))
    return <ItemList items={body.sessions as Item[]} empty="Nothing is on the calendar yet." />;
  if (Array.isArray(body.items)) return <ItemList items={body.items as Item[]} empty="Nothing matched." />;
  return <pre className="snippet">{JSON.stringify(body, null, 2)}</pre>;
}
