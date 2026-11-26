import { updateReport } from "../db/queries";
import type { reports } from "../db/schema";
import type { CheckedClaim } from "../rules/claims";
import { TOPICS } from "../rules/topics";
import { researchGraph, type State } from "./graph";

// Runs the graph for one account and saves what each step returns, so its row on the table fills in live.
// The graph is in graph.ts. This file only listens to it and writes to Postgres.

type Change = Partial<typeof reports.$inferInsert>;

export const STOPPED = "The research stopped before it finished. The server log has the reason.";

export function notFound(company: string): string {
  return `No company called "${company}" was found on the web. Check the spelling, or type its website.`;
}

// What has been learned so far. Researchers finish one at a time, so each adds to what came before.
type SoFar = { claims: CheckedClaim[]; topicsDone: string[] };

function changeFor(node: string, update: Partial<State>, soFar: SoFar): Change {
  if (node === "identify")
    return { identity: update.identity ?? null, step: `Researching ${TOPICS.length} topics` };
  if (node === "research") {
    soFar.claims.push(...(update.claims ?? []));
    soFar.topicsDone.push(...(update.topicsDone ?? []));
    const step =
      soFar.topicsDone.length < TOPICS.length
        ? `Researched ${soFar.topicsDone.length} of ${TOPICS.length} topics`
        : "Scoring the lead";
    return { claims: [...soFar.claims], topicsDone: [...soFar.topicsDone], step };
  }
  return { facts: update.facts ?? null, score: update.score ?? null, step: "Done" };
}

export async function runResearch(
  reportId: string,
  company: string,
  today = new Date().toISOString().slice(0, 10),
) {
  const soFar: SoFar = { claims: [], topicsDone: [] };
  let cost = 0;
  let found = false;
  try {
    const stream = await researchGraph.stream({ company, today }, { streamMode: "updates" });
    for await (const step of stream) {
      for (const [node, update] of Object.entries(step) as [string, Partial<State>][]) {
        if (node === "identify") found = Boolean(update.identity);
        cost += update.cost ?? 0;
        await updateReport(reportId, { ...changeFor(node, update, soFar), cost });
      }
    }
    const finished = found
      ? { status: "done" as const }
      : { status: "failed" as const, error: notFound(company) };
    await updateReport(reportId, { ...finished, cost, finishedAt: new Date() });
  } catch (error) {
    console.error(`Report ${reportId} for "${company}" stopped:`, error);
    await updateReport(reportId, { status: "failed", error: STOPPED, cost, finishedAt: new Date() });
  }
}
