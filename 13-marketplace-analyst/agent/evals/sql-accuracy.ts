import { runSelect } from "../../db/readonly";
import { type Query, succeeded } from "../../rules/result";
import { sameResult } from "../../rules/same-result";

// Execution accuracy: run the reference query and compare rows. The SQL text may differ completely.
// No model judges this one.
export async function scoreSql(gold: string, got: Query[]): Promise<number> {
  const expected = await runSelect(gold);
  return succeeded(got).some((query) => sameResult(expected.rows, query.rows)) ? 1 : 0;
}
