import { tool } from "ai";
import { z } from "zod";
import { handOffConversation } from "../../db/conversations";

export type HandOffOutput = { opened: true; email: string } | { opened: false; reason: string };

// Passes this conversation to the support inbox. The team reads the whole conversation and the summary,
// so nobody asks the visitor to repeat themselves. A signed-in visitor's own email always wins.
export function handOff(conversationId: string, signedInEmail: string | null) {
  return tool({
    description:
      "Passes the conversation to a person on the team. Use for refunds, cancellations, price exceptions, " +
      "account or payment problems, or when the visitor asks for a person.",
    inputSchema: z.object({
      summary: z.string().describe("One or two sentences: what the visitor needs, in their words."),
      email: z.email().optional().describe("The email the visitor wrote, if they are not signed in."),
    }),
    execute: async ({ summary, email }): Promise<HandOffOutput> => {
      const replyTo = signedInEmail ?? email;
      if (!replyTo) return { opened: false, reason: "No email to reply to. Ask the visitor for one." };
      if (!(await handOffConversation(conversationId, summary, replyTo)))
        return { opened: false, reason: "A person on the team has this conversation already." };
      return { opened: true, email: replyTo };
    },
  });
}
