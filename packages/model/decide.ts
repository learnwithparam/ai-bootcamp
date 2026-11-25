import { required } from "./model";

// A decision model answers one multiple-choice question about a situation and says how sure it is.
// The agent does not make the call itself: the choice comes from here, and the product acts on it.
// It uses the OpenRouter Decisions API, the same call agentic-ai-buildcamp makes.

export type Question<Choice extends string> = {
  instructions: string;
  criteria: Record<Choice, string>;
};

export type Decision<Choice extends string> = { choice: Choice; confidence: number };

type Answer = { type: string; choice: string; confidence: number };

const DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";

export async function decide<Choice extends string>(
  state: string,
  question: Question<Choice>,
): Promise<Decision<Choice>> {
  const response = await fetch(DECISIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("OPENROUTER_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: required("DECISION_MODEL"),
      state,
      questions: { decision: { type: "choice", ...question } },
    }),
  });
  if (!response.ok) {
    throw new Error(`Decision request failed (${response.status}): ${await response.text()}`);
  }
  const { answers } = (await response.json()) as { answers: Record<string, Answer> };
  const answer = answers.decision;
  if (!answer || !(answer.choice in question.criteria)) {
    throw new Error(`Decision model returned an unknown choice: ${JSON.stringify(answer)}`);
  }
  return { choice: answer.choice as Choice, confidence: answer.confidence };
}
