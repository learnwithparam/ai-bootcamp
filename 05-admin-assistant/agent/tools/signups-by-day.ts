import { tool } from "ai";
import { z } from "zod";
import { signupsByDay } from "../../db/queries";
import { type DayCount, everyDay, todayUtc } from "../../rules/days";

export type SignupsOutput = { days: DayCount[]; total: number };

// The page draws this output as a bar chart. The model only writes the sentences under it.
export const signupsByDayTool = tool({
  description: "New accounts per day (UTC) for the last N days, today included, with every day listed.",
  inputSchema: z.object({ days: z.number().int().min(1).max(90) }),
  execute: async ({ days }): Promise<SignupsOutput> => {
    const filled = everyDay(await signupsByDay(days), days, todayUtc());
    return { days: filled, total: filled.reduce((sum, day) => sum + day.signups, 0) };
  },
});
