// Which shell commands the agent may run, decided before anything runs.
// No shell ever reads the line. It is split into words and handed straight to one program,
// so `;`, `&&`, pipes, redirects and `$()` cannot chain a second command: they are refused here instead.

export type CommandVerdict = { ok: true; argv: string[] } | { ok: false; reason: string };

// Each program the agent may run, and the subcommands it may use. null means any arguments.
export const ALLOWED: Record<string, string[] | null> = {
  ls: null,
  cat: null,
  head: null,
  tail: null,
  grep: null,
  wc: null,
  find: null,
  git: ["diff", "status", "log", "show"],
  bun: ["test"],
};

const SHELL_SIGNS = /[;&|<>$`\\\n]/;
// Flags that would let an allowed program run or write something else.
// find writes a file with -fprint, -fprint0, -fprintf and -fls. git accepts a long flag cut short,
// so --ou means --output and --ext means --ext-diff, and every such prefix is refused.
const RISKY_FLAGS = /^(-exec|-execdir|-delete|-ok|-okdir|-fprint\w*|-fls|-c)(=|$)|^--ou|^--ext/;

// Splits a line into words. Quotes group words and are removed; anything shell-like outside quotes is refused.
export function splitWords(line: string): string[] | null {
  const words: string[] = [];
  for (const [, double, single, bare] of line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)) {
    if (bare !== undefined && (SHELL_SIGNS.test(bare) || /["']/.test(bare))) return null;
    words.push(double ?? single ?? bare ?? "");
  }
  return words;
}

// A path outside the repo, written as /etc, ~/ or ../, or into .git, is refused for every program.
function leavesRepo(word: string): boolean {
  const path = word.includes("=") && word.startsWith("-") ? word.slice(word.indexOf("=") + 1) : word;
  const parts = path.toLowerCase().split("/");
  return path.startsWith("/") || path.startsWith("~") || parts.includes("..") || parts.includes(".git");
}

export function checkCommand(line: string): CommandVerdict {
  const argv = splitWords(line.trim());
  if (!argv) return { ok: false, reason: "Run one program at a time. ; && | > and $() are not allowed." };
  const [program, subcommand] = argv;
  if (!program) return { ok: false, reason: "The command is empty." };
  if (!(program in ALLOWED)) {
    const list = Object.keys(ALLOWED).join(", ");
    return { ok: false, reason: `${program} is not on the list of programs the agent may run: ${list}.` };
  }
  const subcommands = ALLOWED[program];
  if (subcommands && !subcommands.includes(subcommand ?? "")) {
    return {
      ok: false,
      reason: `Only ${subcommands.map((each) => `${program} ${each}`).join(", ")} may run.`,
    };
  }
  const risky = argv.find((word) => RISKY_FLAGS.test(word));
  if (risky) return { ok: false, reason: `${risky} would let ${program} run or write something else.` };
  if (argv.slice(1).some(leavesRepo)) return { ok: false, reason: "Paths must stay inside the repo." };
  return { ok: true, argv };
}
