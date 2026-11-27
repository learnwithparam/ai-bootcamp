import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";
import {
  brokenProse,
  fillAnswer,
  hasWords,
  missingSlots,
  namesColumn,
  plainTemplate,
  requiredSlots,
  splitByList,
  tidy,
  ungroundedNumbers,
} from "../../rules/fill-answer";
import { overBudget } from "../../rules/limits";
import { NO_QUERY, OVER_BUDGET } from "../../rules/replies";
import { describeShapes, succeeded } from "../../rules/result";
import { askFor } from "../ask";
import { fill } from "../prompt";
import prompt from "../prompts/analysis.md" with { type: "text" };
import { report, type State } from "../state";

// Writes the answer from the results' shapes. It leaves slots, and code fills them from the rows.

const Written = z.object({ answer: z.string() });

export function analysisPrompt({ history, question, queries }: State): string {
  const results = succeeded(queries);
  const required = requiredSlots(results).join(" ") || "none";
  return fill(prompt, { history, question, shapes: describeShapes(results), required });
}

// What is wrong with a template, as the next thing to tell the model. Empty when nothing is.
export function fault(template: string, { question, history, queries }: State): string {
  if (missingSlots(template, queries).length) return "left out the required slots";
  if (succeeded(queries).length && !hasWords(template)) return "had no sentence saying what the figures are";
  if (splitByList(template)) return "carried the sentence on after a list: end the sentence before it";
  if (namesColumn(template, queries)) return "used a column name: say it in plain words";
  if (brokenProse(template))
    return "asked the question back, left a sentence unfinished or typed a stray brace";
  if (ungroundedNumbers(template, `${question} ${history}`, queries).length) return "typed a figure itself";
  if (fillAnswer(template, queries).removed.length) return "used a slot that does not exist";
  return "";
}

// The model gets one more try at a faulty answer. After that, code writes it.
async function writeTemplate(state: State) {
  const asked = analysisPrompt(state);
  let cost = 0;
  let retry = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const written = await askFor(Written, asked + retry, "analysis");
    cost += written.cost;
    const template = written.output.answer.trim();
    const wrong = fault(template, state);
    if (!wrong) return { template, cost, byCode: false };
    retry = `\n\nYour last answer ${wrong}. Write it again:\n${template}`;
  }
  return { template: plainTemplate(state.queries), cost, byCode: true };
}

const fixed = (answer: string) => ({ answer, answerTemplate: answer, removed: [] });

export async function analysis(state: State, config?: LangGraphRunnableConfig) {
  report(config, { name: "analysis", status: "running", detail: "Writing from the result's shape" });
  const stop = !succeeded(state.queries).length ? NO_QUERY : overBudget(state.cost) ? OVER_BUDGET : "";
  if (stop) {
    report(config, { name: "analysis", status: "failed", detail: "No answer written" });
    return fixed(stop);
  }
  const { template, cost, byCode } = await writeTemplate(state);
  const { answer, removed } = fillAnswer(template, state.queries);
  const dropped = removed.length ? `Dropped ${removed.length} slots with no value` : "Filled from the rows";
  const detail = byCode ? "Listed the rows: the model's answer did not hold up" : dropped;
  report(config, { name: "analysis", status: "done", detail });
  return { answer, answerTemplate: tidy(template), removed, cost };
}
