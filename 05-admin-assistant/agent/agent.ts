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
// The system prompt is plain text in instructions.md, next to this file.
import instructions from "./instructions.md" with { type: "text" };
import { skillMenu, skillNamed } from "./skills/skills";
import { allTools, NEEDS_APPROVAL, type ToolName } from "./tools/all";

// Start here. The owner's message goes to a model that sees only one tool, load_skill, and one line per skill.
// Loading a skill switches on that skill's tools for the rest of the conversation.
// A tool that changes something stops and waits for the owner to approve its exact input on a card.

// The skills loaded earlier in the conversation, read from the load_skill calls in the history.
export function skillsLoadedIn(messages: UIMessage[]): string[] {
  return messages.flatMap((message) =>
    message.parts.flatMap((part) =>
      part.type === "tool-load_skill" && part.state === "output-available"
        ? [(part.input as { name: string }).name]
        : [],
    ),
  );
}

// The skills loaded during this reply, from the steps that already ran.
function skillsLoadedInSteps(steps: StepResult<ToolSet>[]): string[] {
  return steps.flatMap((step) =>
    step.toolResults.flatMap((result) =>
      result.toolName === "load_skill" ? [(result.input as { name: string }).name] : [],
    ),
  );
}

// load_skill, plus the tools of every loaded skill. Nothing else can be called, whatever the message says.
export function activeToolsFor(skillNames: string[]): ToolName[] {
  const fromSkills = skillNames.flatMap((name) => (skillNamed(name)?.allowedTools ?? []) as ToolName[]);
  return ["load_skill", ...new Set(fromSkills)];
}

// The approval card is signed with this secret, so an approval the browser made up, or one for an edited coupon,
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

export async function answerOwner(messages: UIMessage[], ownerId: string) {
  const loadedBefore = skillsLoadedIn(messages);
  return streamText({
    model: model(),
    system: instructions.replace("{{skills}}", skillMenu()),
    messages: await convertToModelMessages(messages),
    tools: allTools(ownerId),
    toolApproval: Object.fromEntries(NEEDS_APPROVAL.map((name) => [name, "user-approval"])),
    experimental_toolApprovalSecret: approvalSecret(),
    prepareStep: ({ steps }) => ({
      activeTools: activeToolsFor([...loadedBefore, ...skillsLoadedInSteps(steps)]),
    }),
    stopWhen: stepCountIs(8),
    experimental_telemetry: { isEnabled: true, functionId: "admin-assistant" },
  });
}
