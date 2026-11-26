import { rawTextProblem } from "@bootcamp/ui/raw-text";

// The terminal's checkPage. Every screen the end-to-end test reaches goes through it, and it fails on
// what a person should never read: markdown left as raw text, or a tool's internal id.
// A diff line is code, so it may hold backticks; those lines start with +, - or · and are left out.

export function checkScreen(screen: string): void {
  const prose = screen
    .split("\n")
    .map((line) => line.replace(/^[│\s]+|[│\s]+$/g, ""))
    .filter((line) => !/^[+\-·] /.test(line))
    .join("\n");
  const problem = rawTextProblem(prose);
  if (problem) throw new Error(`The terminal ${problem}\n${screen}`);
}
