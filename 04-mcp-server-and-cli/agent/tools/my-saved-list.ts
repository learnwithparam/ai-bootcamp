import { z } from "zod";
import { savedItems } from "../../db/queries";
import { personalTool } from "./tool";

export const mySavedList = personalTool({
  name: "my_saved_list",
  description: "The items the signed-in person saved for later, newest first.",
  input: z.object({}),
  run: async (_input, userId) => ({ items: await savedItems(userId) }),
});
