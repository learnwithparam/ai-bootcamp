import { z } from "zod";
import { allItems } from "../../db/queries";
import { upcoming } from "../../rules/catalog";
import { publicTool } from "./tool";

export const upcomingSessions = publicTool({
  name: "upcoming_sessions",
  description: "The live labs and workshops that have not happened yet, soonest first, with date and length.",
  input: z.object({}),
  run: async () => ({ sessions: upcoming(await allItems(), new Date().toISOString().slice(0, 10)) }),
});
