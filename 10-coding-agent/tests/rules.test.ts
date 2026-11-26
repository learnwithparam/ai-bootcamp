import { describe, expect, test } from "bun:test";
import { headline, money, repoName, toolLabel } from "@bootcamp/coding-harness/rules/labels";
import { readSession, settle, summarize } from "@bootcamp/coding-harness/rules/session";
import { parseDiff } from "../rules/diff";
import { replayItems } from "../rules/replay";
import { whyCannotReview } from "../rules/review";
import { asFile, DIFF, sampleSession } from "./session";

// The rules with no model: how a session reads, the diff, the replay, the labels, and who may review.
// What the agent may run and touch is tested with the harness, in packages/coding-harness/tests.

describe("the session file", () => {
  test("the summary comes from the events", () => {
    const summary = summarize(readSession(asFile(sampleSession())));
    expect(summary).toMatchObject({ repo: "vercel/ms", outcome: "passed", steps: 2, blocked: 1 });
    expect(summary.cost).toBeCloseTo(0.003);
    expect(summary.before?.fail).toBe(2);
  });
  test("a line that is not an event names its line", () => {
    expect(() => readSession(`${asFile(sampleSession()).split("\n")[0]}\n{"type":"nope"}`)).toThrow("Line 2");
  });
  test("a file without an end is refused", () => {
    expect(() => summarize(sampleSession().slice(0, 3))).toThrow("ends with end");
  });
  test("done with an empty diff ends as no change; any other ending stays", () => {
    expect(settle("passed", "Done.", "  \n").outcome).toBe("no_change");
    expect(settle("passed", "Done.", DIFF)).toEqual({ outcome: "passed", reason: "Done." });
    expect(settle("check_failed", "Red.", "").outcome).toBe("check_failed");
  });
});

describe("the diff", () => {
  test("lines carry their old and new numbers", () => {
    const [file] = parseDiff(DIFF);
    expect(file).toMatchObject({ path: "src/index.ts", added: 1, removed: 0 });
    expect(file?.hunks[0]?.lines.map((line) => [line.kind, line.oldNumber, line.newNumber])).toEqual([
      ["same", 10, 10],
      ["add", null, 11],
      ["same", 11, 12],
    ]);
  });
});

describe("the replay", () => {
  const items = replayItems(sampleSession());
  test("cost lines fold into steps and every item keeps its place", () => {
    expect(items.map((item) => item.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(items.at(-1)).toMatchObject({ title: "Check passed", tone: "pass", spent: 0.003 });
  });
  test("an edit shows what it took out and put in, behind its own fold", () => {
    const edit = items.find((item) => item.title === "Edited src/index.ts");
    expect(edit?.detail).toBe("Took out:\nconst w\n\nPut in:\nconst mo");
    expect(edit?.fold).toBe("Show the change");
  });
  test("a refused call names the rule in words", () => {
    expect(items.find((item) => item.tone === "wait")?.detail).toBe(
      "The protect tests rule said: Tests are fixed.",
    );
  });
});

describe("labels", () => {
  test.each([
    ["https://github.com/vercel/ms.git", "vercel/ms"],
    ["git@github.com:vercel/ms.git", "vercel/ms"],
    ["ssh://git@github.com/vercel/ms", "vercel/ms"],
  ])("%s is shown as owner/repo", (remote, name) => {
    expect(repoName(remote)).toBe(name);
  });
  test("a headline is the first sentence, cut at 90 characters", () => {
    expect(headline("Support months. A month is 1/12 of a year.")).toBe("Support months.");
    expect(headline("a".repeat(120))).toHaveLength(90);
  });
  test("a raw tool name is never the label", () => {
    expect(toolLabel("bash", { command: "git diff" })).toBe("Ran git diff");
    expect(toolLabel("mystery", {})).toBe("Used a tool");
    expect(money(0.0044)).toBe("$0.0044");
  });
});

describe("who may review", () => {
  const reviewer = { id: "theo", role: "reviewer" as const };
  const run = { userId: "maya", outcome: "passed", filesChanged: 1 };
  test("a reviewer approves someone else's passing run", () => {
    expect(whyCannotReview(reviewer, run, "approved", "")).toBeNull();
  });
  test.each([
    [{ id: "ravi", role: "developer" as const }, run, "approved", "", "Only a reviewer"],
    [{ id: "maya", role: "reviewer" as const }, run, "approved", "", "You ran this one"],
    [reviewer, { ...run, outcome: "out_of_steps" }, "approved", "", "whose check passed"],
    [reviewer, { ...run, filesChanged: 0 }, "approved", "", "changed no files"],
    [reviewer, run, "changes_requested", "  ", "Say what should change"],
    [reviewer, run, "changes_requested", "x".repeat(2001), "under 2000"],
  ] as const)("refused: %#", (person, target, verdict, note, words) => {
    expect(whyCannotReview(person, target, verdict, note)).toContain(words);
  });
});
