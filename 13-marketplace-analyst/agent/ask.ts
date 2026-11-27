import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import type { z } from "zod";
import { analystModel } from "./model";
import { costOf, traced } from "./prompt";

// One typed answer from the model, for the calls that need no tools.

// A small model now and then fills its reply with blank space instead of JSON, or thinks without end.
// The cap stops it from running on. The second try does not think, so it cannot run on again.
const MAX_REPLY_TOKENS = { quick: 1000, thinking: 8000 };

const unreadable = (error: unknown) =>
  NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error);

export async function askFor<T>(schema: z.ZodType<T>, prompt: string, name: string, thinks = false) {
  let cost = 0;
  const ask = async (thinking: boolean) => {
    const result = await generateText({
      model: analystModel({ thinks: thinking }),
      output: Output.object({ schema }),
      maxOutputTokens: MAX_REPLY_TOKENS[thinking ? "thinking" : "quick"],
      prompt,
      experimental_telemetry: traced(name),
    });
    // Counted before the output is read: a reply that cannot be read was still paid for.
    cost += costOf(result.usage);
    return result.output as T;
  };
  const output = await ask(thinks).catch((error) => {
    if (!unreadable(error)) throw error;
    console.error(`marketplace-analyst: ${name} got an unreadable reply, asking again`, error.message);
    return ask(false);
  });
  return { output, cost };
}
