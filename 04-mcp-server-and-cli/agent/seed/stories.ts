// What each seeded developer did, oldest first. hoursAgo spreads it over ten days.
// app: which connected app made the call. ask: a plain-words question, answered by the real model.
export type Call = {
  tool: string;
  input: Record<string, unknown>;
  hoursAgo: number;
  app?: "cli" | "planner";
  ask?: string;
};

type Labs = readonly [string, string];

export function anaStory([lab, other]: Labs): Call[] {
  return [
    { tool: "search_catalog", input: { query: "evals" }, hoursAgo: 230 },
    { tool: "upcoming_sessions", input: {}, hoursAgo: 228, app: "cli" },
    { tool: "search_catalog", input: { query: "agents", kind: "lab" }, hoursAgo: 200, app: "cli" },
    { tool: "save_for_later", input: { url: lab }, hoursAgo: 199, app: "cli" },
    // Pasted a link from a newsletter that is not in the catalog.
    {
      tool: "save_for_later",
      input: { url: "https://www.learnwithparam.com/blog/not-a-real-page" },
      hoursAgo: 150,
      app: "cli",
    },
    { tool: "my_saved_list", input: {}, hoursAgo: 120, app: "planner" },
    { tool: "save_for_later", input: { url: other }, hoursAgo: 96 },
    { tool: "my_saved_list", input: {}, hoursAgo: 72, app: "planner" },
    { tool: "search_catalog", input: { query: "r" }, hoursAgo: 30, app: "cli" },
    { tool: "", input: {}, hoursAgo: 5, ask: "What live labs are coming up next?" },
    { tool: "my_saved_list", input: {}, hoursAgo: 2, app: "planner" },
  ];
}

export function benStory([lab]: Labs): Call[] {
  return [
    { tool: "search_catalog", input: { query: "vector database" }, hoursAgo: 60 },
    { tool: "save_for_later", input: { url: lab }, hoursAgo: 59 },
    { tool: "my_saved_list", input: {}, hoursAgo: 3 },
  ];
}
