import { mySavedList } from "./my-saved-list";
import { saveForLater } from "./save-for-later";
import { searchCatalog } from "./search-catalog";
import type { CatalogTool } from "./tool";
import { upcomingSessions } from "./upcoming-sessions";

// Every tool. The chat, the MCP server and the CLI all read this one list, so a new tool appears in all three.
export const TOOLS: CatalogTool[] = [searchCatalog, upcomingSessions, saveForLater, mySavedList];

export function findTool(name: string): CatalogTool | undefined {
  return TOOLS.find((tool) => tool.name === name);
}
