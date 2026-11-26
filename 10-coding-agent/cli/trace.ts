import { checkWords } from "../rules/check";
import { blockedLabel, money, OUTCOME_LABEL, toolLabel } from "../rules/labels";
import type { SessionEvent } from "../rules/session";

// What the terminal shows while the agent works: one line per event, coloured, in the words the review page uses.

const tint = (code: number) => (text: string) =>
  process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;
const grey = tint(90);
const green = tint(32);
const red = tint(31);
const yellow = tint(33);
const bold = tint(1);

const short = (text: string, length = 110) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

function line(event: SessionEvent): string | null {
  if (event.type === "start")
    return `${bold("Task")} ${short(event.task)}\n${grey(`in ${event.repo} at ${event.commit.slice(0, 8)}`)}`;
  if (event.type === "check_before") return `${grey("Check before:")} ${checkWords(event.result)}`;
  if (event.type === "thought") return `${grey(`${event.step}.`)} ${short(event.text)}`;
  if (event.type === "tool")
    return `   ${event.ok ? green("✓") : red("✗")} ${short(toolLabel(event.tool, event.input))}`;
  if (event.type === "blocked")
    return `   ${yellow("⊘")} ${short(blockedLabel(event.tool, event.input))} ${grey(`(${event.by})`)}`;
  if (event.type === "check") {
    const mark = event.result.passed ? green("✓ Check passed:") : red("✗ Check failed:");
    return `   ${mark} ${checkWords(event.result)}`;
  }
  if (event.type === "end") {
    const label =
      event.outcome === "passed" ? green(OUTCOME_LABEL.passed) : red(OUTCOME_LABEL[event.outcome]);
    return `\n${bold(label)}. ${event.reason}`;
  }
  return null;
}

export function printEvent(event: SessionEvent, spent: { cost: number }): void {
  if (event.type === "usage") spent.cost += event.cost;
  const text = line(event);
  if (text) console.log(text);
  if (event.type === "end") console.log(grey(`Spent ${money(spent.cost)}.`));
}
