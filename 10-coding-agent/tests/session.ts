import type { SessionEvent } from "@bootcamp/coding-harness/rules/session";

// A small session file for tests that read one without running the model: one edit, then the check passes.
// The diff is a real `git diff` shape, so the runs list counts one changed file.

export const DIFF = [
  "diff --git a/src/index.ts b/src/index.ts",
  "--- a/src/index.ts",
  "+++ b/src/index.ts",
  "@@ -10,3 +10,4 @@ const d = h * 24;",
  " const w = d * 7;",
  "+const mo = y / 12;",
  " const y = d * 365.25;",
  "",
].join("\n");

const at = (second: number) => new Date(Date.UTC(2026, 10, 26, 9, 0, second)).toISOString();
const passing = { passed: true, pass: 12, fail: 0, failures: [], output: "12 pass\n0 fail" };
const failing = { passed: false, pass: 10, fail: 2, failures: ["months"], output: "10 pass\n2 fail" };

export function sampleSession(diff = DIFF): SessionEvent[] {
  return [
    {
      type: "start",
      at: at(0),
      task: "Support months. A month is 1/12 of a year.",
      repo: "vercel/ms",
      commit: "0d5ab182ef22",
      check: "bun test ./src",
    },
    { type: "check_before", at: at(1), result: failing },
    { type: "thought", at: at(2), step: 1, text: "I will add `mo` to the units." },
    { type: "usage", at: at(2), step: 1, cost: 0.001, tokens: 900 },
    {
      type: "tool",
      at: at(3),
      step: 1,
      tool: "edit",
      input: { path: "src/index.ts", old_text: "const w", new_text: "const mo" },
      output: "Edited",
      ok: true,
    },
    {
      type: "blocked",
      at: at(4),
      step: 2,
      tool: "edit",
      input: { path: "src/index.test.ts" },
      by: "protect-tests",
      reason: "Tests are fixed.",
    },
    { type: "usage", at: at(4), step: 2, cost: 0.002, tokens: 1200 },
    { type: "check", at: at(5), step: 2, result: passing },
    { type: "end", at: at(6), outcome: "passed", reason: "Done.", diff },
  ];
}

export const asFile = (events: SessionEvent[]) => events.map((event) => JSON.stringify(event)).join("\n");
