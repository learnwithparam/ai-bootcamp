import type { Chart } from "../rules/chart-spec";
import type { Step } from "../rules/parts";
import type { Intent } from "../rules/replies";
import type { Query } from "../rules/result";
import { analystGraph } from "./graph";
import type { State } from "./state";

// Runs the graph for one question and hands over each thing as it happens. The chat, the seed and the
// evals all come through here, so what is measured is what a person gets.

export type Event =
  | { kind: "step"; step: Step }
  | { kind: "queries"; queries: Query[] }
  | { kind: "cost"; costUsd: number };

export type Answered = {
  intent: Intent;
  queries: Query[];
  toolCalls: string[];
  errors: string[];
  repairs: number;
  answer: string;
  answerTemplate: string;
  removed: string[];
  chart?: Chart;
  costUsd: number;
};

type Tell = (event: Event) => void;

function absorb(done: Answered, node: string, update: Partial<State>, tell: Tell) {
  const { intent, answer, answerTemplate, removed, chart, queries, iteration } = update;
  const known = { intent, answer, answerTemplate, removed, chart, queries, repairs: iteration };
  Object.assign(done, Object.fromEntries(Object.entries(known).filter(([, value]) => value !== undefined)));
  done.toolCalls.push(...(update.toolCalls ?? []));
  done.errors.push(...(update.errors ?? []));
  done.costUsd += update.cost ?? 0;
  if (node === "executeSql" && queries) tell({ kind: "queries", queries });
  tell({ kind: "cost", costUsd: done.costUsd });
}

export async function askAnalyst(question: string, history = "(none)", tell: Tell = () => {}) {
  const done: Answered = {
    intent: "in_scope",
    queries: [],
    toolCalls: [],
    errors: [],
    repairs: 0,
    answer: "",
    answerTemplate: "",
    removed: [],
    costUsd: 0,
  };
  const stream = await analystGraph.stream({ question, history }, { streamMode: ["updates", "custom"] });
  for await (const [mode, chunk] of stream) {
    if (mode === "custom") {
      tell({ kind: "step", step: chunk as Step });
      continue;
    }
    for (const [node, update] of Object.entries(chunk as Record<string, Partial<State>>))
      absorb(done, node, update ?? {}, tell);
  }
  return done;
}
