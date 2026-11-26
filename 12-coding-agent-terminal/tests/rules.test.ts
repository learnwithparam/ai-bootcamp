import { describe, expect, test } from "bun:test";
import { permissionFor } from "@bootcamp/coding-harness/rules/permission";
import { ANSWERS, answerForKey, settleAnswer } from "../rules/answers";
import { readTyped, suggestions } from "../rules/commands";
import { changeOf, unifiedDiff } from "../rules/diff";
import { move, NEW_HISTORY, remember } from "../rules/history";
import { piecesOf } from "../rules/markdown";
import { EMPTY_STATUS, itemFor, statusAfter } from "../rules/screen";
import { checkScreen } from "./screen";

describe("what you type", () => {
  test("a slash command, a practice task, or a task in words", () => {
    expect(readTyped("/help")).toEqual({ kind: "help" });
    expect(readTyped("/practice months")).toEqual({ kind: "practice", slug: "months" });
    expect(readTyped("fix the failing test")).toEqual({ kind: "task", task: "fix the failing test" });
    expect(readTyped("   ")).toBeNull();
  });

  test("a wrong command says what to type instead", () => {
    expect(readTyped("/nope")).toEqual({
      kind: "unknown",
      message: "There is no /nope. Type /help to see the commands.",
    });
    expect(readTyped("/practice days")?.kind).toBe("unknown");
  });

  test("a / offers the commands that start with it", () => {
    expect(suggestions("/pr")).toEqual(["/practice months", "/practice weeks", "/practice release"]);
    expect(suggestions("/help")).toEqual([]);
    expect(suggestions("fix it")).toEqual([]);
  });

  test("history keeps each line once and Up walks back", () => {
    let history = remember(remember(remember(NEW_HISTORY, "/help"), "/help"), "fix it");
    expect(history.lines).toEqual(["/help", "fix it"]);
    const up = move(history, -1);
    expect(up.line).toBe("fix it");
    history = move(up.history, -1).history;
    expect(move(history, 1).line).toBe("fix it");
    expect(move(move(history, 1).history, 1).line).toBe("");
  });
});

describe("the permission prompt", () => {
  const edit = permissionFor("edit", { path: "src/index.ts", old_text: "a", new_text: "b" });

  test("y and 1 say yes once, n and 3 say no, 2 remembers", () => {
    expect(answerForKey("y")).toBe("once");
    expect(answerForKey("1")).toBe("once");
    expect(answerForKey("3")).toBe("deny");
    expect(answerForKey("n")).toBe("deny");
    expect(answerForKey("x")).toBeNull();
  });

  test("Always lets every later edit through until you quit, and No lets nothing through", () => {
    if (!edit) throw new Error("an edit must ask");
    const allowed = new Set<string>();
    expect(settleAnswer("deny", edit, allowed)).toBe(false);
    expect(allowed.size).toBe(0);
    expect(settleAnswer("always", edit, allowed)).toBe(true);
    expect([...allowed]).toEqual(["edits"]);
  });

  test("the second answer names what it will allow", () => {
    const test = permissionFor("bash", { command: "bun test" });
    if (!edit || !test) throw new Error("both must ask");
    expect(ANSWERS[1]?.label(edit)).toBe("Yes, and allow edits until I quit");
    expect(ANSWERS[1]?.label(test)).toBe("Yes, and allow bun test until I quit");
  });
});

describe("the diff under an edit", () => {
  test("unchanged lines stay as context, and only real changes are marked", () => {
    const diff = unifiedDiff("a.ts", "one\ntwo\nthree\n", "one\nTWO\nthree\n");
    expect(diff.split("\n").slice(3, 7)).toEqual([" one", "-two", "+TWO", " three"]);
  });

  test("a write is all new lines, and other tools have no diff", () => {
    expect(changeOf("write", { path: "b.md", content: "hi\n" })).toEqual({
      text: "--- a/b.md\n+++ b/b.md\n@@ -1,0 +1,1 @@\n+hi\n",
      filetype: "markdown",
    });
    expect(changeOf("bash", { command: "ls" })).toBeUndefined();
  });
});

describe("the transcript", () => {
  test("a tool shows in words, with its output kept for Ctrl+O", () => {
    const item = itemFor({
      type: "tool",
      at: "2026-11-26T10:00:00.000Z",
      step: 1,
      tool: "read",
      input: { path: "src/index.ts" },
      ok: true,
      output: "const a = 1;",
    });
    expect(item).toEqual({
      tone: "pass",
      text: "✓ Read src/index.ts",
      diff: undefined,
      detail: "const a = 1;",
    });
  });

  test("a no from you reads as your answer", () => {
    const item = itemFor({
      type: "blocked",
      at: "2026-11-26T10:00:00.000Z",
      step: 2,
      tool: "edit",
      input: { path: "src/index.ts" },
      by: "You",
      reason: "no",
    });
    expect(item?.text).toBe("⊘ Not allowed to change src/index.ts: you said no");
    expect(item?.tone).toBe("wait");
  });
});

describe("the status line", () => {
  test("it adds up steps, tokens and cost", () => {
    const usage = {
      type: "usage",
      at: "2026-11-26T10:00:00.000Z",
      step: 1,
      tokens: 1200,
      cost: 0.001,
    } as const;
    const twice = statusAfter(statusAfter(EMPTY_STATUS, usage), { ...usage, step: 2 });
    expect(twice).toMatchObject({ steps: 2, tokens: 2400 });
    expect(twice.cost).toBeCloseTo(0.002);
  });
});

describe("the model's markdown on a terminal", () => {
  test("code and bold keep their look and lose their marks", () => {
    expect(piecesOf("format as `mo`, **not** years")).toEqual([
      [
        { text: "format as ", look: "plain" },
        { text: "mo", look: "code" },
        { text: ", ", look: "plain" },
        { text: "not", look: "bold" },
        { text: " years", look: "plain" },
      ],
    ]);
  });

  test("a heading loses its #, a list gets a bullet, a link shows its address", () => {
    expect(piecesOf("## Done\n- one\nsee [docs](https://x.dev)")).toEqual([
      [{ text: "Done", look: "bold" }],
      [{ text: "• one", look: "plain" }],
      [
        { text: "see ", look: "plain" },
        { text: "docs (https://x.dev)", look: "plain" },
      ],
    ]);
  });

  test("checkScreen fails raw markdown in prose and lets a diff line through", () => {
    expect(() => checkScreen("I added `mo` to the parser")).toThrow("raw markdown");
    expect(() => checkScreen("│ + return `mo`; │\nDone.")).not.toThrow();
  });
});
