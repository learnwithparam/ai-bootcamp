import { Command } from "@langchain/langgraph";
import { addCost, updateIntake } from "../db/queries";
import type { intakes } from "../db/schema";
import type { Decision, Pause, Request } from "../rules/intake";
import { intakeGraph, type State } from "./graph";

// Runs the graph for one request, and resumes it after each lawyer's step. The graph is in graph.ts.
// This file only listens to it and copies each step's result to the intakes row, which the screens read.

type Change = Partial<typeof intakes.$inferInsert>;

export const STOPPED = "The request stopped before it finished. The server log has the reason.";

const config = (id: string) => ({ configurable: { thread_id: id } });

function changeFor(node: string, update: Partial<State>): Change {
  if (node === "assess") return { assessment: update.assessment };
  if (node === "checkConflicts") return { conflicts: update.conflicts };
  if (node === "lawyerReview") return { decision: update.decision, status: "drafting" };
  if (node === "writeLetter") return { draft: update.draft };
  if (node === "approveLetter") return { letter: update.letter, status: "answered", answeredAt: new Date() };
  return {};
}

// The steps run until the graph pauses or ends. Each result is saved as it comes.
async function run(id: string, input: Parameters<typeof intakeGraph.stream>[0]) {
  const stream = await intakeGraph.stream(input, { ...config(id), streamMode: "updates" });
  for await (const step of stream) {
    for (const [node, update] of Object.entries(step) as [string, Partial<State>][]) {
      if (node === "__interrupt__") continue;
      if (update.cost) await addCost(id, update.cost);
      const change = changeFor(node, update);
      if (Object.keys(change).length > 0) await updateIntake(id, change);
    }
  }
  const pause = await pausedAt(id);
  if (pause)
    await updateIntake(id, {
      status: pause.kind === "review" ? "needs review" : "letter ready",
      error: pause.refused ?? null,
    });
}

// Where the saved run is waiting, read from the checkpoint. null when it is not waiting.
export async function pausedAt(id: string): Promise<Pause | null> {
  const state = await intakeGraph.getState(config(id));
  const waiting = state.tasks.flatMap((task) => task.interrupts);
  return (waiting[0]?.value as Pause | undefined) ?? null;
}

export async function startIntake(id: string, request: Request) {
  try {
    await run(id, { request });
  } catch (error) {
    console.error(`Request ${id} stopped:`, error);
    await updateIntake(id, { status: "failed", error: STOPPED });
  }
}

// A lawyer's answer to a pause. An answer that breaks a rule leaves the run paused, with the reason saved.
export async function resumeIntake(id: string, answer: Decision | string) {
  await run(id, new Command({ resume: answer }));
}

// After a failed step, such as the model not answering, the run starts again from the last saved step.
export async function retryIntake(id: string) {
  await updateIntake(id, { error: null });
  await run(id, null);
}
