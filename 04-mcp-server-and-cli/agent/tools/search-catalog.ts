import { KINDS } from "@bootcamp/catalog";
import { z } from "zod";
import { searchItems } from "../../db/queries";
import { publicTool } from "./tool";

export const searchCatalog = publicTool({
  name: "search_catalog",
  title: "Search the catalog",
  description:
    "Search learnwithparam's labs, courses, posts, newsletter issues, playbooks and ebooks by words. " +
    "Returns up to five items with their title, link, kind, date and summary.",
  input: z.object({
    query: z.string().min(2).describe("Words to search for, like 'evals' or 'coding agents'."),
    kind: z
      .enum(KINDS)
      .optional()
      .describe(
        "Only this kind of item. 'upcoming' is a live lab that has not happened yet, 'lab' is one that already ran. " +
          "Leave it out when looking for an item by its title.",
      ),
  }),
  run: async ({ query, kind }) => ({ items: await searchItems(query, kind, 5) }),
});
