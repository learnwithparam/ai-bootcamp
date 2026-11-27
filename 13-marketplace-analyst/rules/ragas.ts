// The arithmetic of the RAGAS metrics (docs.ragas.io), written here so every score can be checked by
// hand. A model gives the verdicts for two of them (agent/evals/); the rest are counted from ids.

const share = (yes: boolean[]) => yes.filter(Boolean).length / yes.length;

// Faithfulness: of the claims in the answer, how many does the context support?
// An answer with no claims has nothing to judge, so it has no score.
export function faithfulness(supported: boolean[]): number | undefined {
  return supported.length ? share(supported) : undefined;
}

// ID-based context precision: of the tables the agent read, how many did the question need?
export function contextPrecision(retrieved: string[], reference: string[]): number {
  return retrieved.length ? share(retrieved.map((id) => reference.includes(id))) : 0;
}

// ID-based context recall: of the tables the question needs, how many did the agent read?
export function contextRecall(retrieved: string[], reference: string[]): number {
  return reference.length ? share(reference.map((id) => retrieved.includes(id))) : 0;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    aa += x * x;
    bb += y * y;
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

// Answer relevancy: questions are written back from the answer, and compared with the one asked.
// An evasive answer ("I do not know") scores zero.
export function answerRelevancy(similarities: number[], evasive: boolean): number {
  if (evasive || !similarities.length) return 0;
  return similarities.reduce((a, b) => a + b, 0) / similarities.length;
}

export function mean(scores: (number | undefined)[]): number {
  const known = scores.filter((score): score is number => score !== undefined);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
}
