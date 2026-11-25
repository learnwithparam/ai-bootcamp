import { model } from "@bootcamp/model";
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
import { allTools, type ToolName } from "./tools/all";

// Start here. The message goes to a model that sees only one tool, load_skill, and one line per skill.
// Loading a skill switches on that skill's tools for the rest of the conversation.
// No tool changes Stripe or sends mail. Tools save drafts, and an owner approves them on the admin pages.

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

// The page the person has open, so "this newsletter" means the one on screen. Only known pages are described.
export function describePage(path: string): string {
  const newsletter = /^\/newsletters\/(\d+)$/.exec(path);
  if (newsletter) return `The person has newsletter ${newsletter[1]} open in the editor.`;
  const known = ["/", "/customers", "/discounts", "/newsletters", "/activity"];
  return known.includes(path)
    ? `The person is on the ${path === "/" ? "Home" : path.slice(1)} page.`
    : "The page is not known.";
}

// On OpenRouter each step's usage.raw.cost holds its price in dollars.
export function costOf(steps: StepResult<ToolSet>[]): number {
  return steps.reduce((sum, step) => sum + ((step.usage.raw as { cost?: number } | undefined)?.cost ?? 0), 0);
}

export async function answerTeam(messages: UIMessage[], userId: string, page: string) {
  const loadedBefore = skillsLoadedIn(messages);
  return streamText({
    model: model(),
    system: instructions.replace("{{skills}}", skillMenu()).replace("{{page}}", describePage(page)),
    messages: await convertToModelMessages(messages),
    tools: allTools(userId),
    prepareStep: ({ steps }) => ({
      activeTools: activeToolsFor([...loadedBefore, ...skillsLoadedInSteps(steps)]),
    }),
    stopWhen: stepCountIs(8),
    experimental_telemetry: { isEnabled: true, functionId: "admin-assistant" },
  });
}
