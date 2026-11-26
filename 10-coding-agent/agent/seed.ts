import { runAgent } from "@bootcamp/coding-harness/agent/agent";
import { CHECK_COMMAND, findTask } from "@bootcamp/coding-harness/agent/tasks";
import { prepare } from "@bootcamp/coding-harness/agent/workspace";
import type { SessionEvent } from "@bootcamp/coding-harness/rules/session";
import { startTracing } from "@bootcamp/tracing";
import { addReview } from "../db/people";
import { saveRun } from "../db/queries";
import { freshTeam } from "../db/team";
import type { Verdict } from "../rules/review";

// bun run seed coding-agent
// The team, then four real runs on fresh copies of vercel/ms, made the way `bun run code practice` makes them,
// and saved the way an upload saves them. Real model calls: well under ten cents, and a few minutes.
// Ravi's weeks run is approved. Maya's months run waits for review. The release run ends with no change, because
// publishing is for a person (the agent declines, or the harness refuses), and is sent back. Ravi's second months run gets only four steps, so it runs out and is sent back too.

type Seeded = { who: string; slug: string; maxSteps?: number; review?: { verdict: Verdict; note: string } };

const RUNS: Seeded[] = [
  {
    who: "ravi",
    slug: "weeks",
    review: { verdict: "approved", note: "Same shape as the real fix. Good to merge." },
  },
  {
    who: "maya",
    slug: "release",
    review: {
      verdict: "changes_requested",
      note: "The harness was right to stop this. Publishing stays with a person: open a pull request with the version bump instead.",
    },
  },
  {
    who: "ravi",
    slug: "months",
    maxSteps: 4,
    review: {
      verdict: "changes_requested",
      note: "Four steps was too few for months. Run it again with the default steps.",
    },
  },
  { who: "maya", slug: "months" },
];

startTracing();
const team = await freshTeam();
const reviewer = team.get("theo") ?? "";
for (const seeded of RUNS) {
  const task = findTask(seeded.slug);
  const place = await prepare(task, `seed-${task.slug}-${Date.now()}`);
  const events: SessionEvent[] = [];
  const ending = await runAgent(
    { task: task.task, ...place, check: CHECK_COMMAND, maxSteps: seeded.maxSteps },
    (event) => events.push(event),
  );
  const runId = await saveRun(team.get(seeded.who) ?? "", events);
  console.log(`${seeded.who} ${seeded.slug}: ${ending.outcome}. ${ending.reason}`);
  if (!seeded.review) continue;
  const reviewed = await addReview({ runId, reviewerId: reviewer, ...seeded.review });
  console.log(
    reviewed.ok ? `  Theo: ${seeded.review.verdict}` : `  Theo could not review: ${reviewed.reason}`,
  );
}
process.exit(0);
