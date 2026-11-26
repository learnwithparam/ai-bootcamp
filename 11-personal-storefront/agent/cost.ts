import type { StepResult, ToolSet } from "ai";

// On OpenRouter each step's usage.raw.cost holds its price in dollars.
export function costOf(steps: StepResult<ToolSet>[]): number {
  return steps.reduce((sum, step) => sum + ((step.usage.raw as { cost?: number } | undefined)?.cost ?? 0), 0);
}
