/** @jsxImportSource @opentui/react */
import { suggestions } from "../rules/commands";
import { COLOR } from "./colors";

// Where you type. A hidden answer, the password for /login, shows one dot per character.

// The typed line with a block cursor, or the hint when nothing is typed yet.
function Typed({ shown, cursor, hint }: { shown: string; cursor: number; hint: string }) {
  if (!shown)
    return (
      <text fg={COLOR.quiet}>
        <span bg={COLOR.you} fg={COLOR.onMark}>
          {" "}
        </span>
        {hint ? ` ${hint}` : ""}
      </text>
    );
  return (
    <text fg={COLOR.you}>
      {shown.slice(0, cursor)}
      <span bg={COLOR.you} fg={COLOR.onMark}>
        {shown[cursor] ?? " "}
      </span>
      {shown.slice(cursor + 1)}
    </text>
  );
}

export function InputBox({
  text,
  cursor,
  label,
  hidden,
  busy,
}: {
  text: string;
  cursor: number;
  label: string | null;
  hidden: boolean;
  busy: boolean;
}) {
  const shown = hidden ? "•".repeat(text.length) : text;
  const hint = busy ? "Esc stops the run" : "Type a task, or / for commands";
  const offered = suggestions(text);
  return (
    <box flexDirection="column" flexShrink={0}>
      <box border borderStyle="rounded" borderColor={COLOR.line} paddingLeft={1} flexDirection="row">
        <text fg={COLOR.mark}>{label ? `${label}: ` : "> "}</text>
        <Typed shown={shown} cursor={cursor} hint={label ? "" : hint} />
      </box>
      {offered.length > 0 ? <text fg={COLOR.quiet}>{`  ${offered.join("   ")}   (Tab)`}</text> : null}
    </box>
  );
}
