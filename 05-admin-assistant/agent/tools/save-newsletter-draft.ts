import { tool } from "ai";
import { z } from "zod";
import { recordChange, saveDraft } from "../../db/queries";

export type SaveDraftOutput = { draftId: number; subject: string };

// Saves only. Sending is a person's job, in the mail tool, after reading the draft.
export function saveNewsletterDraft(ownerId: string) {
  return tool({
    description: "Save a newsletter draft for the owner to read and send. It does not send anything.",
    inputSchema: z.object({ subject: z.string().min(5).max(80), body: z.string().min(50) }),
    execute: async ({ subject, body }): Promise<SaveDraftOutput> => {
      const draftId = await saveDraft({ subject, body, writtenFor: ownerId });
      await recordChange({
        userId: ownerId,
        tool: "save_newsletter_draft",
        input: { subject },
        output: { draftId },
      });
      return { draftId, subject };
    },
  });
}
