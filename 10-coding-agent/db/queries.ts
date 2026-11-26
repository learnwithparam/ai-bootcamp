import { connect } from "@bootcamp/db";
import { sql } from "drizzle-orm";
import { parseDiff } from "../rules/diff";
import type { ReviewState } from "../rules/review";
import { type SessionEvent, summarize } from "../rules/session";
import * as schema from "./schema";
import { runs } from "./schema";

export const db = connect(schema);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isId = (value: string) => UUID.test(value);

// Saves one uploaded session. The summary columns come from the events, never from what the upload claims.
export async function saveRun(userId: string, events: SessionEvent[]): Promise<string> {
  const summary = summarize(events);
  const [row] = await db
    .insert(runs)
    .values({
      userId,
      task: summary.task,
      repo: summary.repo,
      commit: summary.commit,
      checkCommand: summary.checkCommand,
      outcome: summary.outcome,
      reason: summary.reason,
      steps: summary.steps,
      cost: summary.cost,
      blocked: summary.blocked,
      filesChanged: parseDiff(summary.diff).length,
      diff: summary.diff,
      checkBefore: summary.before,
      checkAfter: summary.after,
      events,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
    })
    .returning({ id: runs.id });
  if (!row) throw new Error("The run was not saved.");
  return row.id;
}

// A run's review state is its newest review, or waiting when it has none.
export const STATE = sql<ReviewState>`coalesce((
  select verdict from coding_agent.reviews
  where reviews.run_id = runs.id order by created_at desc limit 1
), 'waiting')`;

export const NAME_OF = (column: string) =>
  sql<string>`coalesce((select name from "user" where "user".id = ${sql.raw(column)}), 'Someone who left')`;
