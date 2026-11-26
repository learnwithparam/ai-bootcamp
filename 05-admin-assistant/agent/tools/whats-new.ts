import { parseCatalog } from "@bootcamp/catalog";
import { tool } from "ai";
import { z } from "zod";
import { todayUtc } from "../../rules/days";
import { type WhatsNew, whatsNew } from "../../rules/whats-new";

const CATALOG = "https://www.learnwithparam.com/llms.txt";

// Read live, so the newsletter is about what the site shows today.
export const whatsNewTool = tool({
  description:
    "Upcoming live labs, labs that ran since a date, and the newest blog posts, from the live site.",
  inputSchema: z.object({
    since: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("YYYY-MM-DD"),
  }),
  execute: async ({ since }): Promise<WhatsNew> => {
    const response = await fetch(CATALOG);
    if (!response.ok) throw new Error(`The catalog answered ${response.status}.`);
    return whatsNew(parseCatalog(await response.text()), since, todayUtc());
  },
});
