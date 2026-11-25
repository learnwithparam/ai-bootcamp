import { tool } from "ai";
import { z } from "zod";
import { type CodeSummary, listCodes } from "../../db/coupons";

export type ListCouponsOutput = { codes: CodeSummary[] };

export const listCoupons = tool({
  description:
    "The discount codes in Stripe, newest first, with their discount, length and how often they were used.",
  inputSchema: z.object({}),
  execute: async (): Promise<ListCouponsOutput> => ({ codes: await listCodes() }),
});
