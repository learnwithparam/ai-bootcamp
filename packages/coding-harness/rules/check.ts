// Reads what `bun test` printed into numbers a person can scan: how many passed, how many failed, and which.

export type CheckResult = { passed: boolean; pass: number; fail: number; failures: string[]; output: string };

const MAX_OUTPUT = 12_000;

// Terminal colour codes: the escape character, then "[", digits and "m".
const COLOUR_CODES = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

export function readTestOutput(output: string, exitCode: number): CheckResult {
  const plain = output.replace(COLOUR_CODES, "");
  const count = (word: string) => Number(plain.match(new RegExp(`^\\s*(\\d+) ${word}$`, "m"))?.[1] ?? 0);
  const failures = [...plain.matchAll(/^\(fail\) (.+?)(?: \[[\d.]+m?s\])?$/gm)].map(([, name]) => name ?? "");
  return {
    passed: exitCode === 0,
    pass: count("pass"),
    fail: count("fail"),
    failures: [...new Set(failures)],
    output:
      plain.length > MAX_OUTPUT ? `${plain.slice(0, MAX_OUTPUT)}\n[cut at ${MAX_OUTPUT} characters]` : plain,
  };
}

export function checkWords(check: Pick<CheckResult, "pass" | "fail">): string {
  if (check.fail === 0) return `${check.pass} passed`;
  return `${check.fail} failed, ${check.pass} passed`;
}
