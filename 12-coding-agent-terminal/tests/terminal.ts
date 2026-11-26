import { Terminal as Screen } from "@xterm/headless";

// The real app in a real pseudo-terminal, read back through a terminal emulator (xterm.js, the one in VS Code).
// So a test sees the screen a person sees, not the raw bytes the app writes.

export const KEYS = {
  enter: "\r",
  escape: "\x1b",
  up: "\x1b[A",
  down: "\x1b[B",
  tab: "\t",
  ctrlO: "\x0f",
  ctrlC: "\x03",
};

export type Running = {
  screen: Screen;
  text: () => string;
  type: (text: string) => Promise<void>;
  press: (key: string) => Promise<void>;
  waitFor: (words: string | RegExp, seconds?: number) => Promise<string>;
  close: () => Promise<void>;
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function start(args: string[] = [], size = { cols: 100, rows: 32 }): Running {
  const screen = new Screen({ ...size, allowProposedApi: true });
  const app = Bun.spawn(["bun", "12-coding-agent-terminal/tui/main.tsx", ...args], {
    env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" },
    terminal: { ...size, data: (_terminal, data) => screen.write(data) },
  });
  const text = () => {
    const buffer = screen.buffer.active;
    return Array.from({ length: size.rows }, (_, row) =>
      (buffer.getLine(buffer.viewportY + row)?.translateToString(true) ?? "").trimEnd(),
    ).join("\n");
  };
  const press = async (key: string) => {
    app.terminal?.write(key);
    await pause(150);
  };
  const type = async (words: string) => {
    for (const char of words) app.terminal?.write(char);
    await pause(150);
  };
  const waitFor = async (words: string | RegExp, seconds = 20) => {
    const until = Date.now() + seconds * 1000;
    while (Date.now() < until) {
      const now = text();
      if (typeof words === "string" ? now.includes(words) : words.test(now)) return now;
      await pause(100);
    }
    throw new Error(`The screen never showed ${words} in ${seconds}s. It shows:\n${text()}`);
  };
  const close = async () => {
    app.terminal?.write(KEYS.ctrlC);
    await Promise.race([app.exited, pause(3000)]);
    app.kill();
    app.terminal?.close();
  };
  return { screen, text, type, press, waitFor, close };
}
