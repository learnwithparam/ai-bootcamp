import { asc, desc, eq, sql } from "drizzle-orm";
import type { View } from "../rules/review";
import type { RunDetail, RunRow } from "../rules/run";
import { db, isId, NAME_OF, STATE } from "./queries";
import { reviews, runs } from "./schema";

// What the review site reads: the runs list with its tabs, and one run with its review history.

const listColumns = {
  id: runs.id,
  task: runs.task,
  repo: runs.repo,
  outcome: runs.outcome,
  steps: runs.steps,
  cost: runs.cost,
  blocked: runs.blocked,
  filesChanged: runs.filesChanged,
  checkBefore: runs.checkBefore,
  checkAfter: runs.checkAfter,
  author: NAME_OF("runs.user_id"),
  userId: runs.userId,
  state: STATE,
  uploadedAt: runs.uploadedAt,
};

export async function listRuns(view: View): Promise<RunRow[]> {
  const query = db.select(listColumns).from(runs);
  const filtered = view === "all" ? query : query.where(sql`${STATE} = ${view}`);
  return filtered.orderBy(desc(runs.uploadedAt)).limit(200);
}

export async function tabCounts(): Promise<Record<View, number>> {
  const rows = await db
    .select({ state: STATE, count: sql<number>`count(*)::int` })
    .from(runs)
    .groupBy(sql`1`);
  const counts: Record<View, number> = { waiting: 0, changes_requested: 0, approved: 0, all: 0 };
  for (const row of rows) {
    counts[row.state] = row.count;
    counts.all += row.count;
  }
  return counts;
}

export async function runById(id: string): Promise<RunDetail | null> {
  if (!isId(id)) return null;
  const [run] = await db
    .select({ row: runs, author: NAME_OF("runs.user_id"), state: STATE })
    .from(runs)
    .where(eq(runs.id, id));
  if (!run) return null;
  const history = await db
    .select({
      id: reviews.id,
      reviewer: NAME_OF("reviews.reviewer_id"),
      verdict: reviews.verdict,
      note: reviews.note,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(eq(reviews.runId, id))
    .orderBy(asc(reviews.createdAt));
  return { ...run.row, author: run.author, state: run.state, reviews: history };
}
