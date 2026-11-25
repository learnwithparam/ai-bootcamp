import { model } from "@bootcamp/model";
import { generateText, Output } from "ai";
import { z } from "zod";
import { type CheckedClaim, keptClaims } from "../../rules/claims";
import type { Identity } from "../../rules/report";
import { backedFacts, type Facts, leadScore } from "../../rules/score";
import { costOf, fill } from "../prompt";
import prompt from "../prompts/facts.md" with { type: "text" };

const fact = <Value extends z.ZodType>(value: Value) =>
  z.object({ value: value.nullable(), claimIds: z.array(z.string()) });

const FactsSchema = z.object({
  employees: fact(z.number().int().positive()),
  lastRoundMonth: fact(z.string().regex(/^\d{4}-\d{2}$/)),
  hiringEngineers: fact(z.boolean()),
  buildsWithAI: fact(z.boolean()),
});

const NOTHING: Facts = {
  employees: { value: null, claimIds: [] },
  lastRoundMonth: { value: null, claimIds: [] },
  hiringEngineers: { value: null, claimIds: [] },
  buildsWithAI: { value: null, claimIds: [] },
};

// The model reads four facts out of the checked claims. The number itself comes from rules/score.ts.
export async function scoreLead(state: {
  identity: Identity | null;
  checked: CheckedClaim[];
  today: string;
}) {
  const kept = keptClaims(state.checked);
  if (kept.length === 0) return { facts: NOTHING, score: leadScore(NOTHING, state.today), cost: 0 };
  const result = await generateText({
    model: model(),
    output: Output.object({ schema: FactsSchema }),
    prompt: fill(prompt, {
      name: state.identity?.name ?? "the company",
      claims: kept.map((claim) => `[${claim.id}] ${claim.text} (quote: "${claim.quote}")`).join("\n"),
    }),
    experimental_telemetry: { isEnabled: true, functionId: "research-agent-facts" },
  });
  const facts = backedFacts(result.output, new Set(kept.map((claim) => claim.id)));
  return { facts, score: leadScore(facts, state.today), cost: costOf(result.usage) };
}
