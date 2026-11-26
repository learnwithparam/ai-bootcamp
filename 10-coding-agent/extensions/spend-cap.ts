import type { Extension } from "../agent/extensions";

// Ends a run that costs more than a small fix should. A loop that keeps trying the same idea is the usual cause.
export const SPEND_CAP_DOLLARS = 0.5;

export const spendCap: Extension = {
  name: "Spend cap",
  afterStep: ({ cost }) =>
    cost > SPEND_CAP_DOLLARS
      ? `This run spent $${cost.toFixed(2)}, over the $${SPEND_CAP_DOLLARS.toFixed(2)} cap for one task.`
      : null,
};
