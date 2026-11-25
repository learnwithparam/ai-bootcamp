import type { CheckedClaim } from "./claims";
import type { Facts, Score } from "./score";

// One saved report, as the screens read it. db/schema.ts stores it; TypeScript checks the two agree
// wherever a page passes a row from the database to a component.

export type Identity = { name: string; website: string; oneLine: string };
export type Status = "running" | "done" | "failed";

export type Report = {
  id: string;
  company: string;
  createdBy: string;
  status: Status;
  step: string;
  identity: Identity | null;
  claims: CheckedClaim[];
  facts: Facts | null;
  score: Score | null;
  cost: number;
  error: string | null;
  createdAt: Date;
  finishedAt: Date | null;
};
