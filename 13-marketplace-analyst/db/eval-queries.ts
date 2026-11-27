import { connect } from "@bootcamp/db";
import { asc, desc, eq } from "drizzle-orm";
import { evalResults, evalRuns } from "./schema";

const db = connect({ evalRuns, evalResults });

export type NewResult = Omit<typeof evalResults.$inferInsert, "runId">;

export async function saveRun(run: typeof evalRuns.$inferInsert, results: NewResult[]): Promise<number> {
  return db.transaction(async (tx) => {
    const [saved] = await tx.insert(evalRuns).values(run).returning({ id: evalRuns.id });
    const runId = saved?.id as number;
    await tx.insert(evalResults).values(results.map((result) => ({ ...result, runId })));
    return runId;
  });
}

export async function latestRun() {
  const [run] = await db.select().from(evalRuns).orderBy(desc(evalRuns.id)).limit(1);
  if (!run) return undefined;
  const results = await db
    .select()
    .from(evalResults)
    .where(eq(evalResults.runId, run.id))
    .orderBy(asc(evalResults.caseId));
  return { ...run, results };
}
