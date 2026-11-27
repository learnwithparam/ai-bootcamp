import { z } from "zod";
import { listTables } from "../../db/catalog";
import { faithfulness } from "../../rules/ragas";
import { askFor } from "../ask";
import { fill } from "../prompt";
import listPrompt from "../prompts/eval-claims.md" with { type: "text" };
import checkPrompt from "../prompts/eval-verify.md" with { type: "text" };

// RAGAS faithfulness, in its two steps. The claims are listed from the answer alone, so nothing in the
// context can turn into a claim. Then each is checked. The judge reads the unfilled answer, never a value.

const Listed = z.object({ claims: z.array(z.string()) });
const Checked = z.object({ verdicts: z.array(z.object({ supported: z.boolean(), why: z.string() })) });

export async function scoreFaithfulness(question: string, template: string, shapes: string) {
  const listed = await askFor(Listed, fill(listPrompt, { question, answer: template }), "eval-claims");
  // The writer knows what the data is (and that money is in reais), so the judge is told the same.
  const { schema } = await listTables();
  const claims = listed.output.claims.map((claim, i) => `${i + 1}. ${claim}`).join("\n");
  const context = { about: schema, question, shapes: shapes || "(no query ran)", claims };
  const checked = await askFor(Checked, fill(checkPrompt, context), "eval-faithfulness", true);
  // A claim the judge gave no verdict for counts against the answer.
  const judged = listed.output.claims.map((claim, i) => {
    const verdict = checked.output.verdicts[i] ?? { supported: false, why: "The judge gave no verdict." };
    return { claim, ...verdict };
  });
  const score = faithfulness(judged.map((c) => c.supported));
  return { score, claims: judged, cost: listed.cost + checked.cost };
}
