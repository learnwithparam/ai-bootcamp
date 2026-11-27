import { embeddingModel } from "@bootcamp/model";
import { embedMany } from "ai";
import { z } from "zod";
import { answerRelevancy, cosine } from "../../rules/ragas";
import { askFor } from "../ask";
import { fill } from "../prompt";
import prompt from "../prompts/eval-questions.md" with { type: "text" };

// RAGAS answer relevancy: write the question back from the answer, and compare it with the one asked.
// The only use of an embedding model in this product, and only in the evals.

const Written = z.object({ questions: z.array(z.string()), evasive: z.boolean() });

export async function scoreRelevancy(question: string, template: string) {
  const { output, cost } = await askFor(Written, fill(prompt, { answer: template }), "eval-relevancy");
  const questions = output.questions
    .map((text) => text.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!questions.length) return { score: 0, written: [], cost };
  const { embeddings } = await embedMany({ model: embeddingModel(), values: [question, ...questions] });
  const [asked = [], ...others] = embeddings;
  const written = questions.map((text, i) => ({
    question: text,
    similarity: cosine(asked, others[i] ?? []),
  }));
  const score = answerRelevancy(
    written.map((each) => each.similarity),
    output.evasive,
  );
  return { score, written, cost };
}
