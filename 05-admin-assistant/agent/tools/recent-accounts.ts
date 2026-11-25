import { tool } from "ai";
import { z } from "zod";
import { recentAccounts } from "../../db/queries";

export type RecentAccountsOutput = { accounts: { name: string; email: string; signedUpAt: string }[] };

// Anyone can sign up, so a name can hold instructions aimed at the model. The owner's card shows the list.
// The model only learns how many accounts are on it, so it never reads, repeats or links a stranger's text.
export function forTheModel(output: RecentAccountsOutput): string {
  return `${output.accounts.length} accounts are listed on the owner's card, newest first. You do not see their names or emails.`;
}

export const recentAccountsTool = tool({
  description:
    "Shows the owner the newest accounts, with name, email and when they signed up. You get only the count.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(50) }),
  execute: async ({ limit }): Promise<RecentAccountsOutput> => ({
    accounts: (await recentAccounts(limit)).map((account) => ({
      name: account.name,
      email: account.email,
      signedUpAt: new Date(account.createdAt).toISOString(),
    })),
  }),
  toModelOutput: ({ output }) => ({ type: "text", value: forTheModel(output) }),
});
