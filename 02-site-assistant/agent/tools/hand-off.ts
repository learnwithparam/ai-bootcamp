import { tool } from "ai";
import { z } from "zod";
import { openTicket } from "../../db/queries";
import type { Turn } from "../choose-action";

export type HandOffOutput =
  | { opened: true; ticket: number; email: string }
  | { opened: false; reason: string };

// Opens a ticket in the support queue with the whole conversation, so the person who picks it up
// does not ask the visitor to repeat themselves. A signed-in visitor's own email always wins.
export function handOff(signedInEmail: string | null, conversation: Turn[]) {
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
      const ticket = await openTicket({ email: replyTo, summary, conversation });
      return { opened: true, ticket, email: replyTo };
    },
  });
}
