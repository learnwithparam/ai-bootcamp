import { Annotation, type LangGraphRunnableConfig } from "@langchain/langgraph";
import type { Chart, ChartKind } from "../rules/chart-spec";
import type { Step } from "../rules/parts";
import type { Intent } from "../rules/replies";
import type { Query } from "../rules/result";

// What one question carries through the graph. `queries` holds rows: a node may put them on screen,
// and may put only their shape in a prompt.

export const AnalystState = Annotation.Root({
  question: Annotation<string>,
  // Earlier turns, with every answer as its unfilled template (rules/message.ts).
  history: Annotation<string>,
  intent: Annotation<Intent>,
  queries: Annotation<Query[]>({ reducer: (_, next) => next, default: () => [] }),
  toolCalls: Annotation<string[]>({ reducer: (all, more) => all.concat(more), default: () => [] }),
  // The errors that were handed to the error agent, in order.
  errors: Annotation<string[]>({ reducer: (all, more) => all.concat(more), default: () => [] }),
  iteration: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  answerTemplate: Annotation<string>,
  answer: Annotation<string>,
  // Slots the model wrote that point at nothing in the result.
  removed: Annotation<string[]>,
  needsGraph: Annotation<boolean>,
  graphKind: Annotation<ChartKind>,
  chart: Annotation<Chart | undefined>,
  cost: Annotation<number>({ reducer: (sum, more) => sum + more, default: () => 0 }),
});

export type State = typeof AnalystState.State;

// Tells the screen what a node is doing, while it does it.
export function report(config: LangGraphRunnableConfig | undefined, step: Step) {
  config?.writer?.(step);
}
