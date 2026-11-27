// The hard stops of one question. The agents cannot talk their way past these: code counts.

export const MAX_COST_USD = 0.02;
export const MAX_REPAIRS = 3;
export const MAX_TOOL_STEPS = 8;
export const MAX_QUERIES = 3;
export const MAX_ROWS = 200;
export const MAX_QUESTION_CHARS = 1000;

export function overBudget(costUsd: number): boolean {
  return costUsd >= MAX_COST_USD;
}
