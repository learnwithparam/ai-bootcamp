import { searchModel } from "@bootcamp/model";
import { generateText, Output } from "ai";
import { z } from "zod";
import { type Claim, cleanUrl, withoutCitations } from "../../rules/claims";
import type { Identity } from "../../rules/report";
import type { Topic } from "../../rules/topics";
import { costOf, fill } from "../prompt";
import prompt from "../prompts/research.md" with { type: "text" };

const Claims = z.object({
  claims: z.array(z.object({ text: z.string(), sourceUrl: z.string(), quote: z.string() })).max(4),
});

export type ResearchTask = { topic: Topic; identity: Identity };

// One researcher, for one topic. The graph runs one of these per topic, all at the same time.
export async function research({ topic, identity }: ResearchTask) {
  const result = await generateText({
    model: searchModel(),
    output: Output.object({ schema: Claims }),
    prompt: fill(prompt, { name: identity.name, website: identity.website, question: topic.question }),
    experimental_telemetry: { isEnabled: true, functionId: `research-agent-${topic.id}` },
  });
  // A strict schema cannot say "a web address", so an address that does not parse is dropped here.
  const usable = result.output.claims.filter((claim) => URL.canParse(claim.sourceUrl));
  const claims: Claim[] = usable.map((claim, index) => ({
    id: `${topic.id}-${index + 1}`,
    topic: topic.id,
    text: withoutCitations(claim.text),
    sourceUrl: cleanUrl(claim.sourceUrl),
    quote: claim.quote,
  }));
  return { claims, cost: costOf(result.usage) };
}
