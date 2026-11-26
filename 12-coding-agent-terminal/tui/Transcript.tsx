/** @jsxImportSource @opentui/react */
import type { Item } from "../rules/screen";
import { COLOR } from "./colors";
import { Diff } from "./Diff";
import { Prose } from "./Prose";

// The conversation so far: what you typed, what the agent said and did, and each check.
// It sticks to the bottom as new lines arrive, like a chat, until you scroll up.

const DETAIL_LINES = 12;

function cut(detail: string): string {
  const lines = detail.split("\n");
  if (lines.length <= DETAIL_LINES) return detail;
  return [...lines.slice(0, DETAIL_LINES), `... ${lines.length - DETAIL_LINES} more lines`].join("\n");
}

function Line({ item, showDetail }: { item: Item; showDetail: boolean }) {
  const indent = item.text.startsWith("✓") || item.text.startsWith("✗") || item.text.startsWith("⊘");
  return (
    <box flexDirection="column" paddingLeft={indent ? 2 : 0} marginTop={item.tone === "you" ? 1 : 0}>
      {item.tone === "plain" ? (
        <Prose text={item.text} color={COLOR.plain} />
      ) : (
        <text fg={COLOR[item.tone]}>{item.tone === "you" ? <strong>{item.text}</strong> : item.text}</text>
      )}
      {item.diff ? (
        <box paddingLeft={2}>
          <Diff text={item.diff.text} />
        </box>
      ) : null}
      {showDetail && item.detail && !item.diff ? (
        <box paddingLeft={2}>
          <text fg={COLOR.quiet}>{cut(item.detail)}</text>
        </box>
      ) : null}
    </box>
  );
}

export function Transcript({
  items,
  streaming,
  working,
  showDetail,
}: {
  items: Item[];
  streaming: string;
  working: boolean;
  showDetail: boolean;
}) {
  return (
    <scrollbox flexGrow={1} stickyScroll stickyStart="bottom" paddingLeft={1} paddingRight={1}>
      {items.map((item) => (
        <Line key={item.id} item={item} showDetail={showDetail} />
      ))}
      {streaming ? <Prose text={streaming} color={COLOR.plain} /> : null}
      {working && !streaming ? <text fg={COLOR.quiet}>Working... Esc stops the run.</text> : null}
    </scrollbox>
  );
}
