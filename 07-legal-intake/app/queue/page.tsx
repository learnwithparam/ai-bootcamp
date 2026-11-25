import { Inbox } from "lucide-react";
import Link from "next/link";
import { BoardTable } from "../../components/BoardTable";
import { FirmShell } from "../../components/FirmShell";
import { Refresher } from "../../components/Refresher";
import { RUNNING } from "../../components/StatusChip";
import { queue } from "../../db/queries";
import { byDeadline, TABS, tabFor } from "../../rules/board";
import { type Intake, PRACTICE_AREAS } from "../../rules/intake";
import { requireStaff } from "../session";

type Search = Promise<{ tab?: string; area?: string }>;

function Tabs({ intakes, current, area }: { intakes: Intake[]; current: string; area: string }) {
  return (
    <nav className="tabs" aria-label="Stages">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/queue?tab=${tab.key}${area ? `&area=${area}` : ""}`}
          className="tab"
          aria-current={tab.key === current ? "page" : undefined}
        >
          {tab.label}
          <span className="tab-count">
            {intakes.filter((intake) => tab.statuses.includes(intake.status)).length}
          </span>
        </Link>
      ))}
    </nav>
  );
}

function AreaFilter({ tab, area }: { tab: string; area: string }) {
  return (
    <form className="board-filter" action="/queue">
      <input type="hidden" name="tab" value={tab} />
      <label htmlFor="area" className="sr-only">
        Practice area
      </label>
      <select id="area" name="area" defaultValue={area}>
        <option value="">Every area</option>
        {PRACTICE_AREAS.map((each) => (
          <option key={each} value={each}>
            {each[0]?.toUpperCase() + each.slice(1)}
          </option>
        ))}
      </select>
      <button type="submit" className="button button-quiet">
        Filter
      </button>
    </form>
  );
}

// The intake board: every request by stage, closest deadline first, with the conflict check beside it.
export default async function BoardPage({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  const { tab: tabKey, area = "" } = await searchParams;
  const tab = tabFor(tabKey);
  const today = new Date();
  const all = (await queue()).filter((intake) => !area || intake.assessment?.area === area);
  const shown = all.filter((intake) => tab.statuses.includes(intake.status)).sort(byDeadline(today));
  const open = all.filter((intake) => TABS[0]?.statuses.includes(intake.status)).length;
  return (
    <FirmShell user={staff} current="board" open={open}>
      <header className="page-header">
        <div>
          <h1>Intake board</h1>
          <p>Requests from the website, read by the assistant and waiting for the firm.</p>
        </div>
        <div className="page-actions">
          <AreaFilter tab={tab.key} area={area} />
        </div>
      </header>
      <Tabs intakes={all} current={tab.key} area={area} />
      {shown.length > 0 ? (
        <BoardTable intakes={shown} today={today} />
      ) : (
        <div className="empty-state panel">
          <Inbox aria-hidden="true" />
          <strong>Nothing here</strong>
          <span>New requests arrive from the intake page at /intake.</span>
        </div>
      )}
      {all.some((intake) => RUNNING.includes(intake.status)) ? <Refresher /> : null}
    </FirmShell>
  );
}
