// What you typed before, brought back with Up and Down, as in a shell.
// A line is kept once: typing the same thing twice in a row adds nothing.

export type History = { lines: string[]; at: number };

export const NEW_HISTORY: History = { lines: [], at: 0 };

export function remember(history: History, line: string): History {
  const text = line.trim();
  const lines = !text || history.lines.at(-1) === text ? history.lines : [...history.lines, text];
  return { lines, at: lines.length };
}

// Up goes back one line, Down forward one; past the newest line the box is empty again.
export function move(history: History, by: -1 | 1): { history: History; line: string } {
  const at = Math.min(Math.max(history.at + by, 0), history.lines.length);
  return { history: { ...history, at }, line: history.lines[at] ?? "" };
}
