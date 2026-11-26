"use client";

import { money } from "@bootcamp/coding-harness/rules/labels";
import { ChevronLeft, ChevronRight, ListChecks, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReplayItem } from "../rules/replay";

const PLAY_EVERY_MS = 900;

// Where the replay is, and whether it is playing. Play from the end starts again from the top.
function useReplay(last: number) {
  const [at, setAt] = useState(last);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (at >= last) return setPlaying(false);
    const timer = setTimeout(() => setAt(at + 1), PLAY_EVERY_MS);
    return () => clearTimeout(timer);
  }, [playing, at, last]);

  // The page opens at the top, so the reviewer reads the task first. Only a move by the reviewer scrolls.
  const [follow, setFollow] = useState(false);
  useEffect(() => {
    if (follow)
      document.getElementById(`replay-${at}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [at, follow]);
  const moveTo = (next: number) => {
    setFollow(true);
    setAt(next);
  };

  const play = () => {
    if (at >= last) moveTo(0);
    setFollow(true);
    setPlaying(!playing);
  };
  return { at, setAt: moveTo, playing, play };
}

// The session played back one thing at a time, like scrubbing a recording.
// Everything up to the current item is shown; the current one is marked and scrolled into view.
export function Replay({ items }: { items: ReplayItem[] }) {
  const last = items.length - 1;
  const replay = useReplay(last);
  return (
    <section className="replay" aria-label="Replay">
      <ReplayBar {...replay} last={last} current={items[replay.at]} total={items.length} />
      <ol className="replay-list">
        {items.slice(0, replay.at + 1).map((each) => (
          <ReplayRow
            key={each.position}
            item={each}
            index={each.position}
            current={each.position === replay.at}
          />
        ))}
      </ol>
    </section>
  );
}

type BarProps = ReturnType<typeof useReplay> & {
  last: number;
  total: number;
  current: ReplayItem | undefined;
};

function ReplayBar({ at, setAt, playing, play, last, total, current }: BarProps) {
  return (
    <div className="replay-bar">
      <button type="button" className="button" onClick={() => setAt(Math.max(0, at - 1))} disabled={at === 0}>
        <ChevronLeft aria-hidden="true" /> Back
      </button>
      <button type="button" className="button button-primary" onClick={play}>
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} {playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        className="button"
        onClick={() => setAt(Math.min(last, at + 1))}
        disabled={at === last}
      >
        Next <ChevronRight aria-hidden="true" />
      </button>
      <button
        type="button"
        className="button button-quiet"
        onClick={() => setAt(last)}
        disabled={at === last}
      >
        <ListChecks aria-hidden="true" /> Show all
      </button>
      <span className="replay-where" aria-live="polite">
        {at + 1} of {total}
        {current?.step ? `, step ${current.step}` : ""}, {money(current?.spent ?? 0)} spent
      </span>
    </div>
  );
}

function ReplayRow({ item, index, current }: { item: ReplayItem; index: number; current: boolean }) {
  const long = item.detail.length > 280 || item.detail.includes("\n");
  return (
    <li
      id={`replay-${index}`}
      className={`replay-item tone-${item.tone}`}
      aria-current={current ? "step" : undefined}
    >
      <span className="replay-step">{item.step ? `Step ${item.step}` : ""}</span>
      <div className="replay-body">
        <p className="replay-title">{item.title}</p>
        {long ? (
          <details open={current}>
            <summary>{item.fold ?? "Show all of it"}</summary>
            <pre className="replay-output">{item.detail}</pre>
          </details>
        ) : (
          item.detail && (
            <p className="replay-detail">
              <WithCode text={item.detail} />
            </p>
          )
        )}
      </div>
    </li>
  );
}

// The model writes `code` in backticks. Each backtick pair becomes a code element, so no raw backtick is shown.
// Each part is keyed by where it starts in the text.
function WithCode({ text }: { text: string }) {
  const parts: { start: number; text: string; code: boolean }[] = [];
  let start = 0;
  text.split(/`([^`\n]+)`/).forEach((part, place) => {
    parts.push({ start, text: part, code: place % 2 === 1 });
    start += part.length + (place % 2 === 1 ? 2 : 0);
  });
  return parts.map((part) => (part.code ? <code key={part.start}>{part.text}</code> : part.text));
}
