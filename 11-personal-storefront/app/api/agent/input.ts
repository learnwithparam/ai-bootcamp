import { z } from "zod";
import { ProfileSchema } from "../../../rules/profile";
import { LONGEST_ASK } from "../../../rules/state";

// What the page sends on each run: AG-UI's RunAgentInput. @ag-ui/core has the type but no check,
// so the route checks the parts it reads. The rest (tools, context) is CopilotKit's and is ignored.

const Message = z.object({
  id: z.string(),
  role: z.string(),
  content: z.unknown().optional(),
  toolCallId: z.string().optional(),
});

export const RunInput = z.object({
  threadId: z.string().max(100),
  runId: z.string().max(100),
  messages: z.array(Message).min(1),
  state: z.object({ profile: ProfileSchema }).passthrough(),
});
export type RunInput = z.infer<typeof RunInput>;

// The newest message decides the run: words from the shopper, or their answer to the basket card.
export type Turn =
  | { kind: "ask"; said: string }
  | { kind: "answer"; toolCallId: string; yes: boolean }
  | { kind: "bad"; why: string };

function jsonOf(text: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text);
    // CopilotKit may send the answer as JSON text inside the message's text.
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch (error) {
    console.error("The basket answer was not JSON.", error);
    return null;
  }
}

const textOf = (content: unknown): string =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) => (typeof part?.text === "string" ? part.text : "")).join(" ")
      : "";

export function turnOf(input: RunInput): Turn {
  const last = input.messages.at(-1);
  if (last?.role === "tool" && last.toolCallId) {
    const answer = z.object({ answer: z.enum(["yes", "no"]) }).safeParse(jsonOf(textOf(last.content)));
    if (!answer.success) return { kind: "bad", why: "That answer to the basket was not yes or no." };
    return { kind: "answer", toolCallId: last.toolCallId, yes: answer.data.answer === "yes" };
  }
  const said = textOf(last?.content).trim();
  if (last?.role !== "user" || !said) return { kind: "bad", why: "Tell us how you shop first." };
  if (said.length > LONGEST_ASK) return { kind: "bad", why: `Keep it under ${LONGEST_ASK} characters.` };
  return { kind: "ask", said };
}
