import { tool } from "ai";
import { z } from "zod";
import { recentAccounts } from "../../db/queries";

export type RecentAccountsOutput = { accounts: { name: string; email: string; signedUpAt: string }[] };

export const recentAccountsTool = tool({
  description: "The newest accounts, newest first, with name, email and when they signed up.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(50) }),
  execute: async ({ limit }): Promise<RecentAccountsOutput> => ({
    accounts: (await recentAccounts(limit)).map((account) => ({
      name: account.name,
      email: account.email,
      signedUpAt: new Date(account.createdAt).toISOString(),
    })),
  }),
});
