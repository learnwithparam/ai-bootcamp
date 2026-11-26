import { RunsTable } from "../components/RunsTable";
import { TeamShell } from "../components/TeamShell";
import { listRuns, tabCounts } from "../db/runs";
import { isView, VIEWS, type View } from "../rules/review";
import { requireMember } from "./session";

export const dynamic = "force-dynamic";

const INTRO: Record<View, string> = {
  waiting: "Runs the agent finished that nobody has reviewed yet. Open one to replay it and read its change.",
  changes_requested: "Runs a reviewer sent back. The note on each says what should change.",
  approved: "Runs a reviewer read and passed. Their change is ready to merge.",
  all: "Every run the team has sent, newest first.",
};

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const person = await requireMember();
  const asked = (await searchParams).view ?? "waiting";
  const view: View = isView(asked) ? asked : "waiting";
  const [rows, counts] = await Promise.all([listRuns(view), tabCounts()]);
  return (
    <TeamShell person={person} current={view} counts={counts}>
      <header className="page-header">
        <div>
          <h1>{VIEWS[view]}</h1>
          <p>{INTRO[view]}</p>
        </div>
      </header>
      <RunsTable rows={rows} />
    </TeamShell>
  );
}
