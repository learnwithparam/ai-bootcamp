import { tool } from "ai";
import { z } from "zod";
import { createNewsletter } from "../../db/newsletters";
import { recordChange } from "../../db/queries";
import { foreignLinks } from "../../rules/email";

export type SaveDraftOutput =
  | { saved: true; newsletterId: number; subject: string }
  | { saved: false; problem: string };

// Saves a new issue on the Newsletters page. Approving it is an owner's job, in the editor, after reading it.
export function saveNewsletterDraft(userId: string) {
  return tool({
    description: "Save a new newsletter draft on the Newsletters page. It does not send anything.",
    inputSchema: z.object({ subject: z.string().min(5).max(80), body: z.string().min(50) }),
    execute: async ({ subject, body }): Promise<SaveDraftOutput> => {
      const outside = foreignLinks(body);
      if (outside.length) {
        return {
          saved: false,
          problem: `Only learnwithparam.com links are allowed. Remove ${outside.join(", ")}.`,
        };
      }
      const saved = await createNewsletter(subject, body, userId);
      await recordChange({
        userId,
        by: "assistant",
        action: "Wrote a newsletter draft",
        detail: { newsletterId: saved.id, subject },
      });
      return { saved: true, newsletterId: saved.id, subject };
    },
  });
}
