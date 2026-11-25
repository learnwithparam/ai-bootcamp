import type { StateSnapshot } from "@langchain/langgraph";
import { STEPS } from "../rules/board";
import { intakeGraph } from "./graph";

// The saved run, read back from its checkpoints: which step finished when.
// This is the audit trail the matter page shows. It comes from LangGraph's store, not from the intakes row.

export type HistoryEntry = { node: string; label: string; at: Date; paused: boolean };

const labelOf = (node: string) => STEPS.find((step) => step.node === node)?.label ?? node;

export async function historyOf(id: string): Promise<HistoryEntry[]> {
  const snapshots: StateSnapshot[] = [];
  for await (const snapshot of intakeGraph.getStateHistory({ configurable: { thread_id: id } })) {
    snapshots.push(snapshot);
  }
  snapshots.reverse();
  return snapshots.slice(1).flatMap((snapshot, index) => {
    const node = snapshots[index]?.next[0];
    // LangGraph's own nodes (__start__) are plumbing, not a step a lawyer would recognise.
    if (!node || node.startsWith("__") || !snapshot.createdAt) return [];
    const paused = snapshot.tasks.some((task) => task.interrupts.length > 0);
    return [{ node, label: labelOf(node), at: new Date(snapshot.createdAt), paused }];
  });
}
