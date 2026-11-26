import { z } from "zod";
import { itemByUrl, saveItem } from "../../db/queries";
import { personalTool } from "./tool";

export const saveForLater = personalTool({
  name: "save_for_later",
  title: "Save for later",
  description:
    "Save one catalog item to the signed-in person's list. Use the url that search_catalog returned.",
  changesData: true,
  input: z.object({ url: z.url().describe("The item's link, exactly as search_catalog returned it.") }),
  run: async ({ url }, userId) => {
    const item = await itemByUrl(url);
    if (!item) throw new Error(`${url} is not in the catalog. Search for the item first and use its link.`);
    await saveItem(userId, url);
    return { saved: item.title, url };
  },
});
