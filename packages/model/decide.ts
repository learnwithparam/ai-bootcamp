import { required } from "./model";

// A decision model answers one multiple-choice question about a situation and says how sure it is.
// The agent does not make the call itself: the choice comes from here, and the product acts on it.
// It uses the OpenRouter Decisions API, the same call agentic-ai-buildcamp makes.

export type Question<Choice extends string> = {
  instructions: string;
  criteria: Record<Choice, string>;
};

// costUsd is what OpenRouter charged for this one decision.
export type Decision<Choice extends string> = { choice: Choice; confidence: number; costUsd: number };

type Answer = { type: string; choice: string; confidence: number };

const DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
// A gateway that is briefly down answers 502, 503 or 504. That one case is tried once more, a moment later.
const BRIEFLY_DOWN = new Set([502, 503, 504]);

function ask(body: string): Promise<Response> {
  return fetch(DECISIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("OPENROUTER_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });
}

export async function decide<Choice extends string>(
  state: string,
  question: Question<Choice>,
): Promise<Decision<Choice>> {
  const body = JSON.stringify({
    model: required("DECISION_MODEL"),
    state,
    questions: { decision: { type: "choice", ...question } },
  });
  let response = await ask(body);
  if (BRIEFLY_DOWN.has(response.status)) {
    await Bun.sleep(1_500);
    response = await ask(body);
  }
  if (!response.ok) {
    throw new Error(`Decision request failed (${response.status}): ${await response.text()}`);
  }
  const { answers, usage } = (await response.json()) as {
    answers: Record<string, Answer>;
    usage?: { cost?: number };
  };
  const answer = answers.decision;
  if (!answer || !(answer.choice in question.criteria)) {
    throw new Error(`Decision model returned an unknown choice: ${JSON.stringify(answer)}`);
  }
  return { choice: answer.choice as Choice, confidence: answer.confidence, costUsd: usage?.cost ?? 0 };
}
