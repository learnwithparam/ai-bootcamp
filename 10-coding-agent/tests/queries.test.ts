import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { addReview } from "../db/people";
import { saveRun } from "../db/queries";
import { listRuns, runById, tabCounts } from "../db/runs";
import { makeAccount, removeAccounts } from "./accounts";
import { sampleSession } from "./session";

// The queries against a real Postgres, with real accounts. Each test account is removed with its runs afterwards.

const people: Record<"developer" | "reviewer" | "other", { id: string; email: string }> = {} as never;
beforeAll(async () => {
  people.developer = await makeAccount("Test Developer", "developer");
  people.reviewer = await makeAccount("Test Reviewer", "reviewer");
  people.other = await makeAccount("Second Reviewer", "reviewer");
});
afterAll(() => removeAccounts(Object.values(people).map((person) => person.id)));

describe("saving a run", () => {
  test("the columns come from the events, and the run starts waiting", async () => {
    const id = await saveRun(people.developer.id, sampleSession());
    const run = await runById(id);
    expect(run).toMatchObject({
      repo: "vercel/ms",
      outcome: "passed",
      filesChanged: 1,
      blocked: 1,
      state: "waiting",
    });
    expect(run?.author).toBe("Test Developer");
    expect((await listRuns("waiting")).some((row) => row.id === id)).toBe(true);
  });
  test("a run with an empty diff counts no files", async () => {
    const id = await saveRun(people.developer.id, sampleSession(""));
    expect((await runById(id))?.filesChanged).toBe(0);
  });
  test("an id that is not a uuid finds nothing, without asking the database", async () => {
    expect(await runById("../../etc")).toBeNull();
  });
});

describe("reviewing a run", () => {
  test("the newest review is the state, and the tab counts move with it", async () => {
    const id = await saveRun(people.developer.id, sampleSession());
    const before = await tabCounts();
    const asked = {
      runId: id,
      reviewerId: people.reviewer.id,
      verdict: "changes_requested" as const,
      note: "Add a test name.",
    };
    expect(await addReview(asked)).toEqual({ ok: true });
    expect(await addReview({ ...asked, reviewerId: people.other.id, verdict: "approved", note: "" })).toEqual(
      { ok: true },
    );
    const run = await runById(id);
    expect(run?.state).toBe("approved");
    expect(run?.reviews.map((review) => review.verdict)).toEqual(["changes_requested", "approved"]);
    const after = await tabCounts();
    expect(after.approved - before.approved).toBe(1);
    expect(after.waiting - before.waiting).toBe(-1);
  });
  test("the rules are checked inside the save: a developer, the author and an empty run are refused", async () => {
    const id = await saveRun(people.developer.id, sampleSession());
    const empty = await saveRun(people.developer.id, sampleSession(""));
    const approve = { runId: id, reviewerId: people.reviewer.id, verdict: "approved" as const, note: "" };
    expect(await addReview({ ...approve, reviewerId: people.developer.id })).toMatchObject({ ok: false });
    expect(await addReview({ ...approve, runId: empty })).toEqual({
      ok: false,
      reason: "This run changed no files, so there is nothing to approve.",
    });
    expect(await addReview({ ...approve, runId: crypto.randomUUID() })).toEqual({
      ok: false,
      reason: "There is no such run.",
    });
    expect((await runById(id))?.reviews).toHaveLength(0);
  });
});
