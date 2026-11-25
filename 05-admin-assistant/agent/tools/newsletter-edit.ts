import { tool } from "ai";
import { z } from "zod";
import { newsletterById, reviseNewsletter } from "../../db/newsletters";
import { recordChange } from "../../db/queries";
import { foreignLinks } from "../../rules/email";

export type OpenNewsletterOutput =
  | { found: true; id: number; status: string; subject: string; body: string }
  | { found: false; problem: string };

export type ReviseNewsletterOutput =
  | { revised: true; id: number; subject: string }
  | { revised: false; problem: string };

// Reads one issue, so an edit starts from the text the person sees in the editor.
export const openNewsletter = tool({
  description: "Read one newsletter by its id: its subject, body and whether it is still a draft.",
  inputSchema: z.object({ id: z.number().int() }),
  execute: async ({ id }): Promise<OpenNewsletterOutput> => {
    const found = await newsletterById(id);
    if (!found) return { found: false, problem: `There is no newsletter ${id}.` };
    return { found: true, id, status: found.status, subject: found.subject, body: found.body };
  },
});

// Replaces a draft's text. The editor shows the change as a diff, with Keep and Undo. Approved issues never change.
export function reviseNewsletterTool(userId: string) {
  return tool({
    description:
      "Replace a newsletter draft's subject and body with an edited version. The person reviews the change.",
    inputSchema: z.object({
      id: z.number().int(),
      subject: z.string().min(5).max(80),
      body: z.string().min(50),
    }),
    execute: async ({ id, subject, body }): Promise<ReviseNewsletterOutput> => {
      const outside = foreignLinks(body);
      if (outside.length) {
        return {
          revised: false,
          problem: `Only learnwithparam.com links are allowed. Remove ${outside.join(", ")}.`,
        };
      }
      const saved = await reviseNewsletter(id, subject, body);
      if (!saved)
        return {
          revised: false,
          problem: `Newsletter ${id} is approved or does not exist, so it cannot change.`,
        };
      await recordChange({
        userId,
        by: "assistant",
        action: "Edited a newsletter draft",
        detail: { newsletterId: id },
      });
      return { revised: true, id, subject };
    },
  });
}
