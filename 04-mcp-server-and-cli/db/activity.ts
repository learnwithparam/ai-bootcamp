import { desc, eq, sql } from "drizzle-orm";
import { db } from "./queries";
import { toolCalls } from "./schema";

export type CallRecord = typeof toolCalls.$inferInsert;

export type ActivityRow = {
  id: number;
  tool: string;
  via: "page" | "ask" | "app";
  appName: string | null;
  input: Record<string, unknown>;
  outcome: "done" | "failed";
  message: string | null;
  ms: number;
  calledAt: Date;
};

export async function recordCall(call: CallRecord): Promise<void> {
  await db.insert(toolCalls).values(call);
}

// One account's calls, newest first, with the name of the app that made each one.
// The app names live in the sign-in tables, which belong to better-auth, so they are joined by hand.
export async function activityOf(userId: string, limit = 100): Promise<ActivityRow[]> {
  const rows = await db
    .select({
      id: toolCalls.id,
      tool: toolCalls.tool,
      via: toolCalls.via,
      appName: sql<string | null>`(select name from "oauthClient" where "clientId" = ${toolCalls.clientId})`,
      input: toolCalls.input,
      outcome: toolCalls.outcome,
      message: toolCalls.message,
      ms: toolCalls.ms,
      calledAt: toolCalls.calledAt,
    })
    .from(toolCalls)
    .where(eq(toolCalls.userId, userId))
    .orderBy(desc(toolCalls.calledAt), desc(toolCalls.id))
    .limit(limit);
  return rows as ActivityRow[];
}
