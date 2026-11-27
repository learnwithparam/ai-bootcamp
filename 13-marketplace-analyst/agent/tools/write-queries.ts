import { generateText, hasToolCall, isStepCount } from "ai";
import { MAX_QUERIES, MAX_TOOL_STEPS } from "../../rules/limits";
import { analystModel } from "../model";
import { costOf, traced } from "../prompt";
import { schemaTools } from "./schema-tools";

// The tool loop the SQL agent and the error agent share: look at the schema, then submit queries.

export type Written = { queries: string[]; reasoning: string; toolCalls: string[]; cost: number };

function trail(calls: { toolName: string; input: unknown }[]): string[] {
  return calls
    .filter((call) => call.toolName !== "submitQuery")
    .map((call) => {
      const { name } = call.input as { name?: string };
      return name ? `${call.toolName} ${name}` : call.toolName;
    });
}

export async function writeQueries(instructions: string, prompt: string, name: string): Promise<Written> {
  const result = await generateText({
    model: analystModel({ thinks: true }),
    instructions,
    prompt,
    tools: schemaTools,
    toolChoice: "required",
    stopWhen: [hasToolCall("submitQuery"), isStepCount(MAX_TOOL_STEPS)],
    experimental_telemetry: traced(name),
  });
  const calls = result.steps.flatMap((step) => step.toolCalls);
  const submitted = calls.findLast((call) => call.toolName === "submitQuery")?.input as
    | { queries?: string[]; reasoning?: string }
    | undefined;
  return {
    queries: (submitted?.queries ?? []).slice(0, MAX_QUERIES),
    reasoning: submitted?.reasoning ?? "",
    toolCalls: trail(calls),
    cost: result.steps.reduce((sum, step) => sum + costOf(step.usage), 0),
  };
}
