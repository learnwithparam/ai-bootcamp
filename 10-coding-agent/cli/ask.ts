import { createInterface } from "node:readline/promises";

// Questions in the terminal. The password is read with echo off, so it never shows on screen.

export async function ask(question: string): Promise<string> {
  const lines = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await lines.question(question);
  lines.close();
  return answer.trim();
}

export function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY)
    throw new Error("Run login in a terminal, so the password can be typed without showing.");
  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let typed = "";
    const onKey = (key: Buffer) => {
      const text = key.toString("utf8");
      if (text === "\u0003") reject(new Error("Stopped."));
      else if (text === "\r" || text === "\n") resolve(typed);
      else if (text === "\u007f") typed = typed.slice(0, -1);
      else typed += text;
      if (text === "\u0003" || text === "\r" || text === "\n") {
        process.stdin.off("data", onKey);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
      }
    };
    process.stdin.on("data", onKey);
  });
}
