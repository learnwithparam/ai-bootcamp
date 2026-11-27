// What an eval run saves, and what the Evals page reads back.

export type Metric =
  | "routing"
  | "sqlAccuracy"
  | "faithfulness"
  | "answerRelevancy"
  | "contextPrecision"
  | "contextRecall"
  | "groundedNumbers"
  | "chartValidity"
  | "privacyLeaks"
  | "toolCalls"
  | "costUsd";

export type RunSummary = Record<Metric, number>;

// The scores one case has. A case only has the metrics its question can be judged on.
export type CaseScores = Partial<Record<Metric, number>>;

export type ClaimVerdict = { claim: string; supported: boolean; why: string };

export type CaseDetail = {
  answer: string;
  template: string;
  route: string;
  // What the judge was given: the SQL and the result's shape, never a row.
  evidence: string;
  claims: ClaimVerdict[];
  // The questions the judge wrote back from the answer, and how close each is to the one asked.
  written: { question: string; similarity: number }[];
  tables: { described: string[]; needed: string[] };
  problems: string[];
};
