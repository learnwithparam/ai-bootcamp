/** @jsxImportSource @opentui/react */
import { afterEach, expect, test } from "bun:test";
import { permissionFor } from "@bootcamp/coding-harness/rules/permission";
import { CHECK_COMMAND } from "@bootcamp/coding-harness/rules/tasks";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { Terminal } from "../agent/agent";
import { App } from "../tui/App";
import { checkScreen } from "./screen";

// The real screens in OpenTUI's test renderer, with no model: the permission prompt is opened by calling
// the same ask() the harness calls, so the test reads exactly what a person reads and presses what they press.

// Every change to the screen goes through act(), so React has drawn it before the test reads the frame.
const step = (change: () => unknown) =>
  act(async () => {
    await change();
  });

let destroy: (() => void) | undefined;
// Unmounting is not a change to check, so React is told it is outside a test before the screen is torn down.
afterEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  destroy?.();
});

async function open(terminal = new Terminal("vercel/ms")) {
  const quit = () => {};
  const view = await testRender(
    <App terminal={terminal} start={{ repo: null, check: CHECK_COMMAND }} quit={quit} />,
    {
      width: 100,
      height: 30,
    },
  );
  destroy = () => view.renderer.destroy();
  const frame = async () => {
    await act(() => view.renderOnce());
    return view.captureCharFrame();
  };
  return { terminal, view, frame };
}

function editRequest(
  old_text = "const y = d * 365.25;\n",
  new_text = "const y = d * 365.25;\nconst mo = y / 12;\n",
) {
  const input = { path: "src/index.ts", old_text, new_text };
  const permission = permissionFor("edit", input);
  if (!permission) throw new Error("an edit must ask");
  return { ...permission, tool: "edit", input };
}

test("an edit waits for you, shows its diff, and 3 says no", async () => {
  const { terminal, view, frame } = await open();
  await step(() => terminal.set({ running: true }));
  let answer: Promise<boolean> = Promise.resolve(true);
  await step(() => {
    answer = terminal.ask(editRequest());
  });
  const asked = await frame();
  expect(asked).toContain("Edit src/index.ts?");
  expect(asked).toContain("+ const mo = y / 12;");
  expect(asked).toContain("2. Yes, and allow edits until I quit");
  await step(() => view.mockInput.pressKey("3"));
  expect(await answer).toBe(false);
  expect(await frame()).not.toContain("Edit src/index.ts?");
});

// The line that stays is code, so it is marked · and the screen check reads it as code, not as raw markdown.
test("a line the edit keeps is marked as code, even when it holds backticks", async () => {
  const { terminal, frame } = await open();
  await step(() => terminal.set({ running: true }));
  // biome-ignore lint/suspicious/noTemplateCurlyInString: this is a line of the file under edit, with its own template literal
  const kept = "  return `${Math.round(ms / d)}d`;\n";
  await step(() => {
    terminal.ask(editRequest(kept, `  if (msAbs >= mo) return "1mo";\n${kept}`));
  });
  const asked = await frame();
  expect(asked).toContain(`· ${kept.trimEnd()}`);
  checkScreen(asked);
});

test("2 says yes and the next edit goes through without asking", async () => {
  const { terminal, view, frame } = await open();
  await step(() => terminal.set({ running: true }));
  let first: Promise<boolean> = Promise.resolve(false);
  await step(() => {
    first = terminal.ask(editRequest());
  });
  await frame();
  await step(() => view.mockInput.pressKey("2"));
  expect(await first).toBe(true);
  expect(await terminal.ask(editRequest())).toBe(true);
  expect(await frame()).not.toContain("Edit src/index.ts?");
});

test("Esc while a prompt waits answers no", async () => {
  const { terminal, view, frame } = await open();
  await step(() => terminal.set({ running: true }));
  let answer: Promise<boolean> = Promise.resolve(true);
  await step(() => {
    answer = terminal.ask(editRequest());
  });
  await frame();
  // A lone Esc reaches the app a moment later, once the terminal knows no other key follows it.
  let said: boolean | undefined;
  await step(async () => {
    view.mockInput.pressEscape();
    said = await answer;
    await Bun.sleep(50);
  });
  expect(said).toBe(false);
});

test("typing goes to the input box, and /help lists the commands", async () => {
  const { view, frame } = await open();
  await act(() => view.mockInput.typeText("/he"));
  expect(await frame()).toContain("/help   (Tab)");
  await step(() => view.mockInput.pressKey("\t"));
  await step(() => view.mockInput.pressEnter());
  const shown = await frame();
  expect(shown).toContain("> /help");
  expect(shown).toContain("/practice <months|weeks|release>");
});

test("the transcript shows events in words, and Ctrl+O shows a tool's output", async () => {
  const { terminal, view, frame } = await open();
  const at = new Date().toISOString();
  terminal.show({
    type: "tool",
    at,
    step: 1,
    tool: "bash",
    input: { command: "ls" },
    ok: true,
    output: "README.md\nsrc",
  });
  await step(() => terminal.show({ type: "usage", at, step: 1, tokens: 4200, cost: 0.0012 }));
  const quiet = await frame();
  expect(quiet).toContain("✓ Ran ls");
  expect(quiet).not.toContain("README.md");
  expect(quiet).toContain("step 1");
  expect(quiet).toContain("4k tokens");
  await step(() => view.mockInput.pressKey("o", { ctrl: true }));
  expect(await frame()).toContain("README.md");
});
