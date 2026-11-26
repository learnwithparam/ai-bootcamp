import type { Tone } from "../rules/screen";

// The terminal's colours. Each tone means one thing everywhere: green passed, red failed, amber is waiting on you.
// added and removed are the backgrounds behind a diff's lines.

export const COLOR: Record<Tone | "mark" | "onMark" | "line" | "added" | "removed", string> = {
  you: "#f4f4f5",
  plain: "#d4d4d8",
  quiet: "#8b8d98",
  pass: "#4ade80",
  fail: "#f87171",
  wait: "#facc15",
  mark: "#faff69",
  onMark: "#151515",
  line: "#3f3f46",
  added: "#14532d",
  removed: "#7f1d1d",
};
