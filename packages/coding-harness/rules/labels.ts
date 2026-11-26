// The words a person reads for each tool call, on the review page and in the terminal.
// A raw tool name is never shown.

const field = (input: Record<string, unknown>, key: string) => String(input[key] ?? "");

export function toolLabel(tool: string, input: Record<string, unknown>): string {
  if (tool === "read") return `Read ${field(input, "path")}`;
  if (tool === "write") return `Wrote ${field(input, "path")}`;
  if (tool === "edit") return `Edited ${field(input, "path")}`;
  if (tool === "bash") return `Ran ${field(input, "command")}`;
  if (tool === "done") return "Said it was done";
  return "Used a tool";
}

export function blockedLabel(tool: string, input: Record<string, unknown>): string {
  if (tool === "read") return `Not allowed to read ${field(input, "path")}`;
  if (tool === "write" || tool === "edit") return `Not allowed to change ${field(input, "path")}`;
  if (tool === "bash") return `Not allowed to run ${field(input, "command")}`;
  return "Not allowed";
}

export const OUTCOME_LABEL = {
  passed: "Check passed",
  no_change: "No change",
  check_failed: "Check failed",
  stopped: "Stopped",
  out_of_steps: "Out of steps",
} as const;

export function money(dollars: number): string {
  return dollars < 0.01 ? `$${dollars.toFixed(4)}` : `$${dollars.toFixed(2)}`;
}

export function duration(from: Date, to: Date): string {
  const seconds = Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// "https://github.com/vercel/ms.git" or "git@github.com:vercel/ms.git" becomes "vercel/ms".
export function repoName(remote: string): string {
  const path = remote
    .replace(/\.git$/, "")
    .replace(/^[a-z+]+:\/\/[^/]+\//, "")
    .replace(/^[^@/]+@[^:]+:/, "");
  return path.split("/").slice(-2).join("/");
}

// The first sentence of a task, short enough for a list or a page title.
export function headline(task: string): string {
  const first = task.split(/(?<=[.!?])\s/)[0]?.trim() ?? task;
  return first.length > 90 ? `${first.slice(0, 89).trimEnd()}…` : first;
}
