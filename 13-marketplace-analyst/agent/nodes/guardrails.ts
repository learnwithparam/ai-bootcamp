import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";
import { type Intent, REPLIES } from "../../rules/replies";
import { askFor } from "../ask";
import { fill } from "../prompt";
import prompt from "../prompts/guardrails.md" with { type: "text" };
import { report, type State } from "../state";

// Step one: should the graph work on this at all? Anything but a real question gets fixed words.

const Verdict = z.object({
  intent: z.enum(["in_scope", "greeting", "out_of_scope", "unsafe"]),
  reason: z.string(),
});

const LABELS: Record<Intent, string> = {
  in_scope: "A question for the records",
  greeting: "A greeting",
  out_of_scope: "Outside this marketplace",
  unsafe: "Refused: not a read of the records",
};

export const guardrailsPrompt = ({ history, question }: State) => fill(prompt, { history, question });

export async function guardrails(state: State, config?: LangGraphRunnableConfig) {
  report(config, { name: "guardrails", status: "running", detail: "Reading the question" });
  const { output, cost } = await askFor(Verdict, guardrailsPrompt(state), "guardrails");
  const { intent } = output;
  report(config, { name: "guardrails", status: "done", detail: LABELS[intent] });
  if (intent === "in_scope") return { intent, cost };
  return { intent, cost, answer: REPLIES[intent], answerTemplate: REPLIES[intent] };
}
