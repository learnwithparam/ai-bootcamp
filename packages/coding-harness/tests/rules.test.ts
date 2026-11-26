import { describe, expect, test } from "bun:test";
import { handleCall } from "../agent/call";
import { reasonToStop, refusal } from "../agent/extensions";
import { readTestOutput } from "../rules/check";
import { checkCommand } from "../rules/commands";
import { checkPath } from "../rules/paths";
import { permissionFor } from "../rules/permission";

// The harness rules with no model: what the agent may run and touch, reading the check, and the extensions.
// Products 10 and 12 both run on these, so a change here is tested once for both.

describe("commands the agent may run", () => {
  test("an allowed program runs as plain words, quotes removed", () => {
    expect(checkCommand('grep -n "months" src/index.ts')).toEqual({
      ok: true,
      argv: ["grep", "-n", "months", "src/index.ts"],
    });
  });
  test.each([
    ["rm -rf src", "not on the list"],
    ["git push", "Only git diff"],
    ["ls && rm -rf .", "one program at a time"],
    ["cat src/a.ts | head", "one program at a time"],
    ["find . -exec rm {} ;", "one program at a time"],
    ["find . -delete", "would let find"],
    ["cat ../secrets", "inside the repo"],
    ["cat /etc/passwd", "inside the repo"],
    ["grep --file=~/x a", "inside the repo"],
    ["find . -fprint src/index.ts", "would let find"],
    ["find . -fls out", "would let find"],
    ["git diff --out=src/index.ts", "would let git"],
    ["cat .git/config", "inside the repo"],
    ["cat .GIT/config", "inside the repo"],
    ["git diff --ext", "would let git"],
  ])("%s is refused", (line, words) => {
    const verdict = checkCommand(line);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason.toLowerCase()).toContain(words.toLowerCase());
  });
});

describe("paths the agent may touch", () => {
  test("a path inside the repo is allowed", () => {
    expect(checkPath("/work/ms", "src/index.ts")).toEqual({
      ok: true,
      full: "/work/ms/src/index.ts",
      inRepo: "src/index.ts",
    });
  });
  test.each(["../other/a.ts", "/etc/hosts", "src/../../x", ".git/config", ".git", ".GIT/config", " "])(
    "%s is refused",
    (path) => {
      expect(checkPath("/work/ms", path).ok).toBe(false);
    },
  );
});

describe("reading the check", () => {
  test("colour codes are removed and failures are named once", () => {
    const colourStart = String.fromCharCode(27);
    const output = `${colourStart}[31m(fail) ms > months [1.20ms]${colourStart}[0m\n(fail) ms > months\n 10 pass\n 2 fail\n`;
    const result = readTestOutput(output, 1);
    expect(result).toMatchObject({ passed: false, pass: 10, fail: 2, failures: ["ms > months"] });
    expect(result.output).not.toContain(colourStart);
  });
});

describe("extensions", () => {
  test.each([
    ["src/index.test.ts", "Protect tests"],
    ["src/__tests__/a.ts", "Protect tests"],
    ["package.json", "No new packages"],
    ["bun.lock", "No new packages"],
    ["SRC/Index.TEST.ts", "Protect tests"],
    ["./src/../src/index.test.ts", "Protect tests"],
    ["src\\index.spec.ts", "Protect tests"],
    ["./Package.JSON", "No new packages"],
    ["src/index.test.ts/", "Protect tests"],
  ])("writing %s is refused by %s", (path, by) => {
    expect(refusal({ tool: "write", input: { path } })?.by).toBe(by);
  });
  test("ordinary code and reads pass", () => {
    expect(refusal({ tool: "edit", input: { path: "src/index.ts" } })).toBeNull();
    expect(refusal({ tool: "read", input: { path: "package.json" } })).toBeNull();
  });
  test("the spend cap ends a run over 50 cents", () => {
    expect(reasonToStop({ step: 3, cost: 0.2 })).toBeNull();
    expect(reasonToStop({ step: 9, cost: 0.51 })).toContain("over the $0.50 cap");
  });
});

describe("what waits for a person", () => {
  test("reading never waits", () => {
    expect(permissionFor("read", { path: "src/index.ts" })).toBeNull();
    expect(permissionFor("bash", { command: "grep -n months src/index.ts" })).toBeNull();
    expect(permissionFor("bash", { command: "git diff" })).toBeNull();
  });
  test("an edit asks, and Always covers every edit", () => {
    expect(permissionFor("edit", { path: "src/index.ts" })).toEqual({
      key: "edits",
      question: "Edit src/index.ts?",
    });
    expect(permissionFor("write", { path: "a.ts" })?.key).toBe("edits");
  });
  test("running tests asks, and Always covers that program and subcommand", () => {
    expect(permissionFor("bash", { command: "bun test src" })).toEqual({
      key: "bun test",
      question: "Run bun test src?",
    });
  });
  test("a command the rules refuse is never offered to a person", () => {
    expect(permissionFor("bash", { command: "rm -rf /" })).toBeNull();
  });
});

describe("a call the model got wrong", () => {
  test("read with no path is answered with what was missing, and the run goes on", async () => {
    const events: unknown[] = [];
    const run = {
      repo: process.cwd(),
      check: "true",
      step: 1,
      record: (event: unknown) => events.push(event),
    };
    const answered = await handleCall({ toolCallId: "c1", toolName: "read", input: {} }, run as never);
    expect(answered.part.output).toEqual({
      type: "text",
      value: expect.stringContaining("The call to read was not complete (path:"),
    });
    expect(events).toEqual([expect.objectContaining({ type: "tool", tool: "read", ok: false })]);
  });
});

describe("which git commands skip the question", () => {
  test("only the read-only git subcommands run without asking", async () => {
    const { ALLOWED } = await import("../rules/commands");
    for (const subcommand of ALLOWED.git ?? []) {
      expect(permissionFor("bash", { command: `git ${subcommand}` })).toBeNull();
    }
    expect(["diff", "status", "log", "show"]).toEqual(expect.arrayContaining(ALLOWED.git ?? []));
  });
});
