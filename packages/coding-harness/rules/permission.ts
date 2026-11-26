import { checkCommand } from "./commands";

// Which tool calls wait for a person before they run, when someone is at the keyboard.
// The harness rules come first: a call they refuse is refused, and no answer from a person can allow it.
// A person can only say no to what the rules would allow. Reading never waits; changing a file or running code does.

export type Permission = {
  // What "Always" remembers: every edit, or one program with its subcommand, such as "bun test".
  key: string;
  // The question, in the words the person reads.
  question: string;
};

const READ_ONLY = new Set(["ls", "cat", "head", "tail", "grep", "wc", "find", "git"]);

export function permissionFor(tool: string, input: Record<string, unknown>): Permission | null {
  const path = String(input.path ?? "");
  if (tool === "edit") return { key: "edits", question: `Edit ${path}?` };
  if (tool === "write") return { key: "edits", question: `Write ${path}?` };
  if (tool !== "bash") return null;
  const verdict = checkCommand(String(input.command ?? ""));
  if (!verdict.ok) return null;
  const [program = "", subcommand = ""] = verdict.argv;
  if (READ_ONLY.has(program)) return null;
  return { key: `${program} ${subcommand}`.trim(), question: `Run ${verdict.argv.join(" ")}?` };
}

// What the model reads when the person says no, and the reason the session file keeps.
export const SAID_NO = "The person at the keyboard said no to this. Try another way, or call done.";
