import { headline } from "@bootcamp/coding-harness/rules/labels";
import { Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChecksView } from "../../../components/ChecksView";
import { OutcomeChip } from "../../../components/Chips";
import { DiffView } from "../../../components/DiffView";
import { Replay } from "../../../components/Replay";
import { ReviewPanel } from "../../../components/ReviewPanel";
import { RunFacts } from "../../../components/RunFacts";
import { TeamShell } from "../../../components/TeamShell";
import { runById, tabCounts } from "../../../db/runs";
import { replayItems } from "../../../rules/replay";
import type { RunDetail } from "../../../rules/run";
import { requireMember } from "../../session";

export const dynamic = "force-dynamic";

const TABS = { replay: "Replay", changes: "Changes", checks: "Checks" } as const;
type Tab = keyof typeof TABS;
const isTab = (value: string): value is Tab => value in TABS;

function TabBody({ tab, run }: { tab: Tab; run: RunDetail }) {
  if (tab === "changes") return <DiffView diff={run.diff} />;
  if (tab === "checks")
    return <ChecksView command={run.checkCommand} before={run.checkBefore} after={run.checkAfter} />;
  return <Replay items={replayItems(run.events)} />;
}

function RunTabs({ id, tab }: { id: string; tab: Tab }) {
  return (
    <nav className="tabs" aria-label="Run">
      {(Object.keys(TABS) as Tab[]).map((each) => (
        <Link
          key={each}
          href={`/runs/${id}?tab=${each}`}
          className="tab"
          aria-current={each === tab ? "page" : undefined}
        >
          {TABS[each]}
        </Link>
      ))}
    </nav>
  );
}

function RunHeader({ run }: { run: RunDetail }) {
  return (
    <header className="page-header">
      <div>
        <h1>{headline(run.task)}</h1>
        <p>
          <OutcomeChip outcome={run.outcome} /> {run.reason}
        </p>
      </div>
      <a className="button" href={`/runs/${run.id}/session`} download>
        <Download aria-hidden="true" /> Session file
      </a>
    </header>
  );
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export default async function RunPage({ params, searchParams }: Props) {
  const person = await requireMember();
  const [run, counts] = await Promise.all([runById((await params).id), tabCounts()]);
  if (!run) notFound();
  const asked = (await searchParams).tab ?? "replay";
  const tab: Tab = isTab(asked) ? asked : "replay";
  return (
    <TeamShell person={person} current={null} counts={counts}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/?view=all">All runs</Link>
      </nav>
      <RunHeader run={run} />
      <div className="run-layout">
        <div className="run-main">
          <RunFacts run={run} />
          <RunTabs id={run.id} tab={tab} />
          <TabBody tab={tab} run={run} />
        </div>
        <ReviewPanel person={person} run={run} />
      </div>
    </TeamShell>
  );
}
