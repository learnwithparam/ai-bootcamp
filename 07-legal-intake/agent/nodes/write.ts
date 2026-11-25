import { model } from "@bootcamp/model";
import { generateText } from "ai";
import type { State } from "../graph";
import { costOf, fill } from "../prompt";
import prompt from "../prompts/letter.md" with { type: "text" };

// Step four: the model drafts the letter to the client, from the lawyer's decision and note.
// A decline gets no details of the request, so the draft cannot repeat a name from the conflict check.
// Nothing is sent: the next step waits for the lawyer to read, edit and approve it.
export async function writeLetter({
  request,
  assessment,
  decision,
}: Pick<State, "request" | "assessment" | "decision">) {
  const result = await generateText({
    model: model(),
    prompt: fill(prompt, {
      clientName: request.clientName,
      choice: decision.choice === "accept" ? "We will take the matter on." : "We cannot take the matter on.",
      note: decision.note || "none",
      summary: decision.choice === "accept" ? assessment.summary : "not given for a decline",
      deadline: assessment.deadline
        ? `${assessment.deadline.date} ("${assessment.deadline.quote}")`
        : "none stated",
    }),
    experimental_telemetry: { isEnabled: true, functionId: "legal-intake-letter" },
  });
  return { draft: result.text.trim(), cost: costOf(result.usage) };
}
