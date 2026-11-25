import { searchModel } from "@bootcamp/model";
import { generateText, Output } from "ai";
import { z } from "zod";
import { cleanUrl, withoutCitations } from "../../rules/claims";
import type { Identity } from "../../rules/report";
import { costOf, fill } from "../prompt";
import prompt from "../prompts/identify.md" with { type: "text" };

const Found = z.object({
  found: z.boolean(),
  name: z.string(),
  website: z.string(),
  oneLine: z.string(),
});

// Step one: which company is this? Everything after it searches for that exact company, by name and website.
export async function identify({ company }: { company: string }) {
  const result = await generateText({
    model: searchModel(),
    output: Output.object({ schema: Found }),
    prompt: fill(prompt, { company }),
    experimental_telemetry: { isEnabled: true, functionId: "research-agent-identify" },
  });
  const { found, name, website, oneLine } = result.output;
  const identity: Identity | null =
    found && name && website && URL.canParse(website)
      ? { name, website: cleanUrl(website), oneLine: withoutCitations(oneLine) }
      : null;
  return { identity, cost: costOf(result.usage) };
}
