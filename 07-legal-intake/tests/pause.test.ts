import { afterAll, expect, test } from "bun:test";
import { Command } from "@langchain/langgraph";
import { pausedAt, resumeIntake } from "../agent/agent";
import { intakeGraph } from "../agent/graph";
import { checkpoints } from "../db/checkpoints";
import { findConflicts } from "../rules/conflicts";
import type { Assessment, Decision } from "../rules/intake";

// The pause survives the process that made it. No model: the steps before the pause are placed as if they had run.

const id = crypto.randomUUID();
const config = { configurable: { thread_id: id } };
afterAll(() => checkpoints.deleteThread(id));

const assessment: Assessment = {
  area: "tenancy",
  summary: "Deposit kept.",
  facts: [],
  deadline: null,
  otherParties: [],
};
const conflicts = findConflicts(
  "Daniel Okafor",
  [],
  [{ name: "Daniel Okafor", role: "adverse", matter: "M-3" }],
);
const request = { clientName: "Daniel Okafor", clientEmail: "d@example.com", otherParties: [], story: "s" };
const decide = (choice: Decision["choice"]): Decision => ({
  choice,
  note: "",
  clearedPossible: true,
  lawyerId: "l",
});

test("a run paused for a lawyer in one process is resumed from Postgres in another", async () => {
  const child = Bun.spawnSync(
    ["bun", "tests/run-to-pause.ts", id, JSON.stringify({ request, assessment, conflicts })],
    {
      cwd: `${import.meta.dir}/..`,
      stderr: "inherit",
    },
  );
  expect(child.exitCode).toBe(0);
  expect(await pausedAt(id)).toEqual({ kind: "review" });

  // Accepting an exact conflict is refused inside the graph. The run asks again, with the reason.
  await resumeIntake(id, decide("accept"));
  expect((await pausedAt(id))?.refused).toContain("must be declined");

  // A decline goes through. Stopped before the letter step, so no model is called.
  await intakeGraph.invoke(new Command({ resume: decide("decline") }), {
    ...config,
    interruptBefore: ["writeLetter"],
  });
  const state = await intakeGraph.getState(config);
  expect(state.values.decision.choice).toBe("decline");
  expect(state.next).toEqual(["writeLetter"]);
}, 30_000);
