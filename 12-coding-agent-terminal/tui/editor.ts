import { useReducer, useRef } from "react";
import { suggestions } from "../rules/commands";
import { type History, move, NEW_HISTORY, remember } from "../rules/history";

// The input box's line editor: typing, Backspace, Left and Right, Up and Down for history, Tab to finish a command.
// It is written here, not taken from a text input, so /login can hide the password as you type it.
// The line lives in a ref, because keys typed fast arrive before React draws again, and each must see the last.

export type Key = { name: string; sequence: string; ctrl: boolean; meta: boolean };

type Line = { text: string; cursor: number; history: History };

export type Editor = { text: string; cursor: number; handle: (key: Key) => string | null };

const printable = (key: Key) =>
  !key.ctrl && !key.meta && key.sequence.length > 0 && [...key.sequence].every((char) => char >= " ");

// The line after one key. Enter is handled by the caller, since it sends the line.
export function edit(line: Line, key: Key): Line {
  const { text, cursor } = line;
  const put = (next: string, at = next.length) => ({ ...line, text: next, cursor: at });
  if (key.name === "backspace")
    return cursor > 0 ? put(text.slice(0, cursor - 1) + text.slice(cursor), cursor - 1) : line;
  if (key.name === "left") return { ...line, cursor: Math.max(cursor - 1, 0) };
  if (key.name === "right") return { ...line, cursor: Math.min(cursor + 1, text.length) };
  if (key.name === "up" || key.name === "down") {
    const moved = move(line.history, key.name === "up" ? -1 : 1);
    return { history: moved.history, text: moved.line, cursor: moved.line.length };
  }
  if (key.name === "tab") return put(suggestions(text)[0] ?? text);
  if (printable(key))
    return put(text.slice(0, cursor) + key.sequence + text.slice(cursor), cursor + key.sequence.length);
  return line;
}

export function useEditor(): Editor {
  const line = useRef<Line>({ text: "", cursor: 0, history: NEW_HISTORY });
  const [, redraw] = useReducer((count: number) => count + 1, 0);
  // Returns the line when Enter sends it, and null for every other key.
  const handle = (key: Key): string | null => {
    const before = line.current;
    if (key.name === "return") {
      line.current = { text: "", cursor: 0, history: remember(before.history, before.text) };
      redraw();
      return before.text;
    }
    line.current = edit(before, key);
    if (line.current !== before) redraw();
    return null;
  };
  return { text: line.current.text, cursor: line.current.cursor, handle };
}
