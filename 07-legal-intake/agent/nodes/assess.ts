import { model } from "@bootcamp/model";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  type Assessment,
  deadlineInStory,
  namesInStory,
  PRACTICE_AREAS,
  type Request,
} from "../../rules/intake";
import { costOf, fill } from "../prompt";
import prompt from "../prompts/assess.md" with { type: "text" };

const Read = z.object({
  area: z.enum(PRACTICE_AREAS),
  summary: z.string(),
  facts: z.array(z.string()),
  deadline: z.object({ date: z.string(), quote: z.string() }).nullable(),
  otherParties: z.array(z.string()),
});

// Step one: the model reads the client's story and fills in a structured assessment.
// Code then drops a deadline the story does not state, and any party name the story does not contain.
export async function assess({ request }: { request: Request }) {
  const result = await generateText({
    model: model(),
    output: Output.object({ schema: Read }),
    prompt: fill(prompt, {
      otherParties: request.otherParties.join(", ") || "none given",
      story: request.story,
    }),
    experimental_telemetry: { isEnabled: true, functionId: "legal-intake-assess" },
  });
  const read = result.output;
  const assessment: Assessment = {
    ...read,
    deadline: deadlineInStory(read.deadline, request.story),
    otherParties: namesInStory(read.otherParties, request.story),
  };
  return { assessment, cost: costOf(result.usage) };
}
