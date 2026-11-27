import { tool } from "ai";
import { z } from "zod";
import { describeTable, listTables } from "../../db/catalog";
import { MAX_QUERIES } from "../../rules/limits";
import { TABLES } from "../../rules/sql-guard";

// What the SQL agents may call. They return names, types and comments, never a row. submitQuery has no
// execute: calling it ends the loop, and its input is the answer.

export const schemaTools = {
  listTables: tool({
    description: "List the tables of the marketplace database and what each one holds.",
    inputSchema: z.object({}),
    execute: () => listTables(),
  }),
  describeTable: tool({
    description: "Show one table's columns, their types and what they mean.",
    inputSchema: z.object({ name: z.enum(TABLES as [string, ...string[]]) }),
    execute: ({ name }) => describeTable(name),
  }),
  submitQuery: tool({
    description: "Hand over the finished SQL. Call this once, last.",
    inputSchema: z.object({
      queries: z.array(z.string()).min(1).max(MAX_QUERIES).describe("PostgreSQL SELECT statements"),
      reasoning: z.string().describe("One or two sentences on what the queries compute"),
    }),
  }),
};
