// Runs one program in the repo, the way both the agent's bash tool and the check do.
// No shell reads the words, and the program gets a clean set of settings: your API keys and
// database address stay in this process, so the repo's code and tests never see them.

export type Ran = { exitCode: number; output: string; timedOut: boolean };

const TIME_LIMIT_MS = 60_000;
const MAX_OUTPUT = 12_000;

export function cleanSettings(): Record<string, string> {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "/tmp",
    NO_COLOR: "1",
    CI: "1",
  };
}

function cut(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}\n[cut at ${limit} characters]` : text;
}

// The limit keeps a huge output out of the model's context. A diff for the review page passes a bigger one.
export async function runProgram(argv: string[], repo: string, limit = MAX_OUTPUT): Promise<Ran> {
  const child = Bun.spawn(argv, { cwd: repo, env: cleanSettings(), stdout: "pipe", stderr: "pipe" });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, TIME_LIMIT_MS);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  clearTimeout(timer);
  const output = cut([stdout, stderr].filter((part) => part.trim()).join("\n"), limit);
  return {
    exitCode,
    output: timedOut ? `${output}\n[stopped after ${TIME_LIMIT_MS / 1000} seconds]` : output,
    timedOut,
  };
}
