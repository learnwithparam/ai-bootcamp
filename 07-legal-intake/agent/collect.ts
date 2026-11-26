import { model } from "@bootcamp/model";
import { generateText, Output } from "ai";
import { z } from "zod";
import { clientWords, type Draft, FIELDS, type FieldName, grounded, merge, missing } from "../rules/collect";
import type { Turn } from "../rules/intake";
import { costOf, fill } from "./prompt";
import prompt from "./prompts/collect.md" with { type: "text" };

// The intake conversation. After each client message the model reads the whole conversation,
// fills in what it can of the form, and asks for the most important thing still missing.

const Read = z.object({
  read: z.object({
    clientName: z.string().nullable(),
    clientEmail: z.string().nullable(),
    otherParties: z.array(z.string()),
    keyDate: z.object({ date: z.string(), quote: z.string() }).nullable(),
    goal: z.string().nullable(),
  }),
  reply: z.string(),
});

export const OPENING: Turn = {
  from: "agent",
  text: "Hello, I am the intake assistant at Harlow Legal. Tell me what happened, in your own words. I will fill in the form as we go, and a lawyer reads every request.",
};

const labelOf = (name: FieldName) => FIELDS.find((field) => field.name === name)?.label ?? name;
const asText = (transcript: Turn[]) =>
  transcript.map((turn) => `${turn.from === "client" ? "Client" : "You"}: ${turn.text}`).join("\n");
const withoutNulls = (read: z.infer<typeof Read>["read"]): Partial<Draft> =>
  Object.fromEntries(Object.entries(read).filter(([, value]) => value !== null)) as Partial<Draft>;

// edited: the fields the client changed by hand. Code keeps them as the client left them.
export async function collect(transcript: Turn[], draft: Draft, edited: FieldName[]) {
  const result = await generateText({
    model: model(),
    output: Output.object({ schema: Read }),
    prompt: fill(prompt, {
      today: new Date().toISOString().slice(0, 10),
      missing: missing(draft).map(labelOf).join(", ") || "nothing",
      draft: JSON.stringify(draft),
      transcript: asText(transcript),
    }),
    experimental_telemetry: { isEnabled: true, functionId: "legal-intake-collect" },
  });
  const kept = grounded(withoutNulls(result.output.read), clientWords(transcript));
  return {
    draft: merge(draft, kept, edited),
    filled: Object.keys(kept) as FieldName[],
    reply: result.output.reply.trim(),
    cost: costOf(result.usage),
  };
}
