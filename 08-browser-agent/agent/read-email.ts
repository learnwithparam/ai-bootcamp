import { model } from "@bootcamp/model";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Email, Reading } from "../rules/email";
import { costOf, fill } from "./prompt";
import prompt from "./prompts/read-email.md" with { type: "text" };

const Read = z.object({ clientName: z.string(), otherSide: z.string() });

// Step one, before any browser: the model reads who needs help and against whom. Code builds the rest of the form.
export async function readEmail(email: Email): Promise<{ reading: Reading; cost: number }> {
  const result = await generateText({
    model: model(),
    output: Output.object({ schema: Read }),
    prompt: fill(prompt, {
      from: `${email.fromName} <${email.fromEmail}>`,
      subject: email.subject,
      body: email.body,
    }),
    experimental_telemetry: { isEnabled: true, functionId: "browser-agent-read-email" },
  });
  return { reading: result.output, cost: costOf(result.usage) };
}
