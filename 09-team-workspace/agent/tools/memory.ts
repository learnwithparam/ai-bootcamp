import { tool } from "ai";
import { z } from "zod";
import { forget, remember } from "../../db/memories";
import { MEMORY } from "../../rules/memory";

export const MEMORY_TOOLS = ["remember", "forget"] as const;

// The two tools that change what the assistant knows about a person in later chats.
// The rules in rules/memory.ts run inside `remember`, so a refused memory is never saved, whatever the model says.
export function memoryTools(userId: string, chatId: string) {
  return {
    remember: tool({
      description:
        "Save one lasting fact or preference the person told you, to use in their later chats. " +
        "Only what the person said themselves, in one short sentence.",
      inputSchema: z.object({
        text: z.string().max(MEMORY.maxLength).describe("The fact, written as a sentence about the person."),
      }),
      execute: async ({ text }) => {
        const saved = await remember(userId, text, chatId);
        return "refused" in saved ? { saved: false, reason: saved.refused } : { saved: true, text };
      },
    }),
    forget: tool({
      description: "Forget one saved memory, by the id shown next to it in the memories list.",
      inputSchema: z.object({ id: z.string().describe("The memory's id, from the list.") }),
      execute: async ({ id }) => ({ forgotten: await forget(userId, id) }),
    }),
  };
}
