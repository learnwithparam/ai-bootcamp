import { afterAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import {
  addEmail,
  db,
  failStalled,
  Halted,
  logStep,
  moveRun,
  removeEmails,
  runById,
  saveRun,
  startRun,
} from "../db/queries";
import { STOPPABLE, whyNotStart } from "../rules/run";

const STORY =
  "My landlord Harbor Lettings has not returned my deposit of 1,200 pounds, three months after I moved out.";

// The queries run against a real Postgres. Each test closes the runs it opened, because open runs count
// against the limit of two at once.
const made: string[] = [];
afterAll(() => removeEmails(made));
async function newEmail() {
  const id = await addEmail({ fromName: "Test", fromEmail: "t@example.com", subject: "s", body: STORY });
  made.push(id);
  return id;
}
const close = (id: string) =>
  moveRun(id, ["reading", "filling", "deciding", "waiting", "submitting"], "stopped");

describe("starting and claiming runs", () => {
  test("three clicks at once on one email start one run", async () => {
    const id = await newEmail();
    const results = await Promise.all([1, 2, 3].map(() => startRun(id, whyNotStart)));
    expect(results.filter((result) => "id" in result)).toHaveLength(1);
    for (const result of results) if ("id" in result) await close(result.id);
  });

  test("two people approving at once: only one moves the run on", async () => {
    const started = await startRun(await newEmail(), whyNotStart);
    if (!("id" in started)) throw new Error(started.refused);
    await moveRun(started.id, ["reading"], "waiting");
    const both = await Promise.all([1, 2].map(() => moveRun(started.id, ["waiting"], "submitting")));
    expect(both.sort()).toEqual([false, true]);
    await close(started.id);
  });
});

describe("runs that stop partway", () => {
  test("a run that stopped writing, for example after a restart, fails and frees its email", async () => {
    const id = await newEmail();
    const dead = await startRun(id, whyNotStart);
    if (!("id" in dead)) throw new Error(dead.refused);
    await moveRun(dead.id, ["reading"], "filling");
    await db.execute(
      sql`update browser_agent.runs set updated_at = now() - interval '10 minutes' where id = ${dead.id}`,
    );
    const again = await startRun(id, whyNotStart);
    if (!("id" in again)) throw new Error(again.refused);
    expect((await runById(dead.id))?.status).toBe("failed");
    expect((await runById(dead.id))?.reason).toContain("Run the agent again");
    // A run that is still writing is left alone.
    await failStalled();
    expect((await runById(again.id))?.status).toBe("reading");
    await close(again.id);
  });
});

describe("a person stops the agent", () => {
  test("after a stop, the agent's next write throws and nothing more is saved", async () => {
    const started = await startRun(await newEmail(), whyNotStart);
    if (!("id" in started)) throw new Error(started.refused);
    await logStep(started.id, { stage: 0, text: "Read it.", at: new Date().toISOString() });
    expect(await moveRun(started.id, STOPPABLE, "stopped", { decidedBy: "Test" })).toBe(true);
    await expect(logStep(started.id, { stage: 1, text: "Opened.", at: "" })).rejects.toBeInstanceOf(Halted);
    await expect(saveRun(started.id, { status: "deciding" })).rejects.toBeInstanceOf(Halted);
    const after = await runById(started.id);
    expect(after?.status).toBe("stopped");
    expect(after?.steps).toHaveLength(1);
    expect(after?.finishedAt).not.toBeNull();
  });

  test("a stop and the agent's send at the same moment: exactly one wins", async () => {
    const started = await startRun(await newEmail(), whyNotStart);
    if (!("id" in started)) throw new Error(started.refused);
    await moveRun(started.id, ["reading"], "deciding");
    const [stopped, sending] = await Promise.all([
      moveRun(started.id, STOPPABLE, "taken_over", { decidedBy: "Test" }),
      moveRun(started.id, ["deciding"], "submitting"),
    ]);
    expect([stopped, sending].filter(Boolean)).toHaveLength(1);
    await close(started.id);
  });

  test("a run that is sending cannot be stopped", async () => {
    const started = await startRun(await newEmail(), whyNotStart);
    if (!("id" in started)) throw new Error(started.refused);
    await moveRun(started.id, ["reading"], "submitting");
    expect(await moveRun(started.id, STOPPABLE, "stopped")).toBe(false);
    await close(started.id);
  });
});
