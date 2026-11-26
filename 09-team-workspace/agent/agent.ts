import { createHash } from "node:crypto";
import { model, required } from "@bootcamp/model";
import {
  convertToModelMessages,
  type StepResult,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";
import { memoriesOf } from "../db/memories";
import { memoryBlock } from "../rules/memory";
// The system prompt is plain text in instructions.md, next to this file.
import instructions from "./instructions.md" with { type: "text" };
import { openConnectors } from "./mcp";
import { MEMORY_TOOLS, memoryTools } from "./tools/memory";

// Start here. One reply: the person's memories go into the prompt, every connector they signed in to is opened,
// and the model answers with the memory tools and the connectors' tools.
// Two limits sit outside the model: a connector tool that may change something waits for the person's approval,
// and once any connector tool has run, nothing can be remembered or forgotten for the rest of the reply.

type Person = { id: string; name: string };

// The connector tools that ran since the person last wrote, in the history and in this reply's steps.
export function connectorToolRan(
  messages: UIMessage[],
  steps: StepResult<ToolSet>[],
  connectorTools: string[],
) {
  const lastUser = messages.findLastIndex((message) => message.role === "user");
  const sinceUser = messages.slice(lastUser + 1).flatMap((message) => message.parts);
  // Connector tools come from MCP, so they arrive as dynamic tools that carry their name.
  const inHistory = sinceUser.some(
    (part) => part.type === "dynamic-tool" && connectorTools.includes(part.toolName),
  );
  const inSteps = steps.some((step) => step.toolCalls.some((call) => connectorTools.includes(call.toolName)));
  return inHistory || inSteps;
}

// The approval card is signed with this secret, so an approval the browser made up, or one for edited input,
// is refused before the tool runs. It is derived from the sign-in secret, so there is no extra setting.
export function approvalSecret(): string {
  return createHash("sha256")
    .update(`tool-approval:${required("BETTER_AUTH_SECRET")}`)
    .digest("hex");
}

// On OpenRouter each step's usage.raw.cost holds its price in dollars.
export function costOf(steps: StepResult<ToolSet>[]): number {
  return steps.reduce((sum, step) => sum + ((step.usage.raw as { cost?: number } | undefined)?.cost ?? 0), 0);
}

function systemPrompt(person: Person, memories: { id: string; text: string }[], notes: string[]): string {
  return instructions
    .replace("{{today}}", new Date().toISOString().slice(0, 10))
    .replace("{{name}}", person.name)
    .replace("{{memories}}", memoryBlock(memories))
    .replace(
      "{{connectors}}",
      notes.length ? notes.map((note) => `- ${note}`).join("\n") : "None added yet.",
    );
}

export async function answer(person: Person, chatId: string, messages: UIMessage[]) {
  const [memories, connectors] = await Promise.all([memoriesOf(person.id), openConnectors(person.id)]);
  const tools: ToolSet = { ...memoryTools(person.id, chatId), ...connectors.tools };
  const connectorTools = Object.keys(connectors.tools);
  const result = streamText({
    model: model(),
    system: systemPrompt(person, memories, connectors.notes),
    messages: await convertToModelMessages(messages),
    tools,
    toolApproval: Object.fromEntries(connectors.needApproval.map((name) => [name, "user-approval"])),
    experimental_toolApprovalSecret: approvalSecret(),
    prepareStep: ({ steps }) => ({
      activeTools: connectorToolRan(messages, steps, connectorTools)
        ? connectorTools
        : [...MEMORY_TOOLS, ...connectorTools],
    }),
    stopWhen: stepCountIs(8),
    experimental_telemetry: { isEnabled: true, functionId: "team-workspace" },
  });
  return { result, close: connectors.close };
}
