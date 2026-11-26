import type { ReviewState, Verdict } from "./review";
import type { Check, Outcome, SessionEvent } from "./session";

// The shapes the review site shows. The database fills them; the screens only read them.

export type RunRow = {
  id: string;
  task: string;
  repo: string;
  outcome: Outcome;
  steps: number;
  cost: number;
  blocked: number;
  filesChanged: number;
  checkBefore: Check | null;
  checkAfter: Check | null;
  author: string;
  userId: string;
  state: ReviewState;
  uploadedAt: Date;
};

export type ReviewRow = { id: string; reviewer: string; verdict: Verdict; note: string; createdAt: Date };

export type RunDetail = RunRow & {
  commit: string;
  checkCommand: string;
  reason: string;
  diff: string;
  events: SessionEvent[];
  startedAt: Date;
  finishedAt: Date;
  reviews: ReviewRow[];
};
