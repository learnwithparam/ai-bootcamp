import { EvalCases, Scorecard } from "../../components/EvalReport";
import { Shell } from "../../components/Shell";
import { latestRun } from "../../db/eval-queries";
import { listConversations } from "../../db/queries";
import { requireUser } from "../session";

export const dynamic = "force-dynamic";

export default async function EvalsPage() {
  const user = await requireUser();
  const [history, run] = await Promise.all([listConversations(user.id), latestRun()]);
  return (
    <Shell userName={user.name} history={history} current="evals">
      <div className="page-header">
        <div>
          <h1>How good are the answers?</h1>
          <p>
            {run
              ? `${run.results.filter((r) => r.passed).length} of ${run.results.length} cases passed on ${run.ranAt.toISOString().slice(0, 10)}. The whole run cost US$${run.costUsd.toFixed(3)}.`
              : "No run yet."}
          </p>
        </div>
      </div>
      {run ? (
        <>
          <Scorecard summary={run.summary} />
          <EvalCases results={run.results} />
        </>
      ) : (
        <p className="empty-note">
          Run <code>bun run proof marketplace-analyst</code> to score the gold set. The result appears here.
        </p>
      )}
    </Shell>
  );
}
