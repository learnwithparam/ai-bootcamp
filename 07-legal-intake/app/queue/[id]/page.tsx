import Link from "next/link";
import { notFound } from "next/navigation";
import { historyOf } from "../../../agent/history";
import { ActionPanel } from "../../../components/ActionPanel";
import { FirmShell } from "../../../components/FirmShell";
import { MatterSummary } from "../../../components/MatterSummary";
import { ClientWords, ConflictCheck, History } from "../../../components/MatterTabs";
import { Refresher } from "../../../components/Refresher";
import { LetterForm } from "../../../components/ReviewForm";
import { RUNNING, StatusChip } from "../../../components/StatusChip";
import { intakeById, openCount } from "../../../db/queries";
import { canDecide } from "../../../rules/board";
import type { Intake } from "../../../rules/intake";
import { requireStaff } from "../../session";
import { approve, decide, retry } from "../actions";

const MATTER_TABS = [
  { key: "summary", label: "Summary" },
  { key: "words", label: "Client's words" },
  { key: "conflicts", label: "Conflicts" },
  { key: "letter", label: "Letter" },
  { key: "history", label: "History" },
];

const defaultTab = (intake: Intake) => (intake.draft ? "letter" : "summary");

function Letter({ intake, locked }: { intake: Intake; locked: boolean }) {
  if (intake.letter)
    return (
      <article className="letter" aria-label="Letter sent">
        <div className="letter-body">{intake.letter}</div>
      </article>
    );
  if (intake.status === "letter ready" && intake.draft)
    return <LetterForm id={intake.id} draft={intake.draft} action={approve} locked={locked} />;
  return <p className="cell-sub">The assistant drafts a letter after a lawyer decides.</p>;
}

async function TabBody({ tab, intake, locked }: { tab: string; intake: Intake; locked: boolean }) {
  if (tab === "words") return <ClientWords intake={intake} />;
  if (tab === "conflicts") return <ConflictCheck intake={intake} />;
  if (tab === "letter") return <Letter intake={intake} locked={locked} />;
  if (tab === "history") return <History entries={await historyOf(intake.id)} intake={intake} />;
  return <MatterSummary intake={intake} />;
}

function MatterHeader({ intake }: { intake: Intake }) {
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/queue">Intake board</Link> / <span>{intake.clientName}</span>
      </nav>
      <header className="page-header">
        <div>
          <h1>{intake.clientName}</h1>
          <p>
            {intake.assessment ? <span className="pill pill-info">{intake.assessment.area}</span> : null}{" "}
            Received {intake.createdAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="page-actions">
          <StatusChip status={intake.status} />
        </div>
      </header>
    </>
  );
}

function MatterTabsNav({ id, tab }: { id: string; tab: string }) {
  return (
    <nav className="tabs" aria-label="Matter">
      {MATTER_TABS.map((each) => (
        <Link
          key={each.key}
          href={`/queue/${id}?tab=${each.key}`}
          className="tab"
          aria-current={each.key === tab ? "page" : undefined}
        >
          {each.label}
        </Link>
      ))}
    </nav>
  );
}

type MatterProps = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

// One request: tabs on the left, and on the right the one step it waits for.
export default async function MatterPage({ params, searchParams }: MatterProps) {
  const staff = await requireStaff();
  const intake = await intakeById((await params).id);
  if (!intake) notFound();
  const tab = (await searchParams).tab ?? defaultTab(intake);
  const open = await openCount();
  const locked = !canDecide(staff.role);
  return (
    <FirmShell user={staff} current="board" open={open}>
      <MatterHeader intake={intake} />
      <div className="matter-grid">
        <div>
          <MatterTabsNav id={intake.id} tab={tab} />
          <TabBody tab={tab} intake={intake} locked={locked} />
        </div>
        <ActionPanel intake={intake} locked={locked} tab={tab} decide={decide} retry={retry} />
      </div>
      {RUNNING.includes(intake.status) ? <Refresher /> : null}
    </FirmShell>
  );
}
