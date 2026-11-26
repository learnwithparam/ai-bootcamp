import { model } from "@bootcamp/model";
import {
  convertToModelMessages,
  type StepResult,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";
import { recordTurn } from "../db/queries";
import { checkCitations, type Source } from "../rules/citations";
import { type Action, chooseAction, type Turn } from "./choose-action";
// The system prompt is plain text in instructions.md, next to this file.
import instructions from "./instructions.md" with { type: "text" };
import { billingPortal } from "./tools/billing-portal";
import { handOff } from "./tools/hand-off";
import { myPlan } from "./tools/my-plan";
import { type SearchOutput, searchSite } from "./tools/search-site";

// Start here. One visitor message goes through three steps:
//   1. a decision model picks the action (answer, ask a follow-up, hand off, decline),
//   2. the assistant replies with only the tools that action allows,
//   3. plain code checks every [n] citation and records the cost of the turn.

// id counts questions for the limits. userId and email come from the session, never from the conversation.
export type Visitor = { id: string; userId: string | null; email: string | null; conversationId: string };

const STEPS: Record<Action, number> = { answer: 5, ask_follow_up: 1, hand_off: 2, decline: 1 };

const WHAT_TO_DO: Record<Action, string> = {
  answer:
    "Answer the visitor. For facts about the school, search the site and cite every fact. " +
    "For their own plan use my_plan, and to change billing use billing_portal, without searching.",
  ask_follow_up: "Ask one short question that would let you help. Do not answer yet.",
  hand_off:
    "Pass the conversation on with hand_off, then tell the visitor a person will reply in this conversation.",
  decline: "Say in one sentence that you can only help with learnwithparam, and offer to help with that.",
};

// The tools an action allows. A tool that is not in the list cannot be called, whatever the message says.
function toolsFor(action: Action, visitor: Visitor, returnUrl: string): ToolSet {
  if (action === "answer") {
    return {
      search_site: searchSite({ next: 1 }),
      my_plan: myPlan(visitor.userId),
      billing_portal: billingPortal(visitor.userId, returnUrl),
    };
  }
  if (action === "hand_off") return { hand_off: handOff(visitor.conversationId, visitor.email) };
  return {};
}

export function toTurns(messages: UIMessage[]): Turn[] {
  return messages.map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    text: message.parts.map((part) => (part.type === "text" ? part.text : "")).join(""),
  }));
}

// Every section the assistant was shown in this reply, so the citation check knows which numbers are real.
export function sourcesShown(steps: StepResult<ToolSet>[]): Source[] {
  return steps.flatMap((step) =>
    step.toolResults.flatMap((result) =>
      result.toolName === "search_site" ? (result.output as SearchOutput).sources : [],
    ),
  );
}

// On OpenRouter each step's usage.raw.cost holds its price in dollars.
export function costOf(steps: StepResult<ToolSet>[]): number {
  return steps.reduce((sum, step) => sum + ((step.usage.raw as { cost?: number } | undefined)?.cost ?? 0), 0);
}

export async function answerVisitor(messages: UIMessage[], visitor: Visitor, returnUrl: string) {
  const conversation = toTurns(messages);
  const decision = await chooseAction(conversation, visitor.email);
  const action = decision.choice;
  const reply = streamText({
    model: model(),
    system: `${instructions}\n\n## This reply\n\n${WHAT_TO_DO[action]}`,
    messages: await convertToModelMessages(messages),
    tools: toolsFor(action, visitor, returnUrl),
    stopWhen: stepCountIs(STEPS[action]),
    prepareStep: ({ stepNumber }) =>
      action === "hand_off" && stepNumber === 0 ? { toolChoice: { type: "tool", toolName: "hand_off" } } : {},
    experimental_telemetry: { isEnabled: true, functionId: `site-assistant.${action}` },
    onFinish: async ({ steps, text }) => {
      const citations = checkCitations(text, sourcesShown(steps));
      await recordTurn({
        visitor: visitor.id,
        conversationId: visitor.conversationId,
        action,
        confidence: decision.confidence,
        costUsd: decision.costUsd + costOf(steps),
        citedPages: citations.citedPages.length,
        badCitations: citations.bad.length,
      });
    },
  });
  return { action, decision, reply };
}
