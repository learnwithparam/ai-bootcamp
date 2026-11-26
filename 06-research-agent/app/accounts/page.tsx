import { Building2 } from "lucide-react";
import { AccountsShell } from "../../components/AccountsShell";
import { AccountTable } from "../../components/AccountTable";
import { AddAccounts } from "../../components/AddAccounts";
import { Refresher } from "../../components/Refresher";
import { teamPeople, teamReports, viewCounts } from "../../db/queries";
import { ownerOfNew, VIEWS, viewOf } from "../../rules/team";
import { addAccounts } from "../actions";
import { requireMember } from "../session";

const EMPTY = {
  all: "No accounts yet. Add a company above and the agents research it while you watch.",
  mine: "You own no accounts yet. Take one from Unassigned, or add your own above.",
  unassigned: "Every account has an owner.",
};

// The team's accounts table. While any row is still being researched, the page reloads its data every two seconds.
export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const member = await requireMember();
  const view = viewOf((await searchParams).view);
  const [reports, counts, people] = await Promise.all([
    teamReports(view, member.id),
    viewCounts(member.id),
    teamPeople(),
  ]);
  return (
    <AccountsShell member={member} current={view} counts={counts}>
      {reports.some((report) => report.status === "running") ? <Refresher /> : null}
      <header className="page-header">
        <div>
          <h1>{VIEWS[view]}</h1>
          <p>
            Each column is a question an agent answers from the live web. Only quotes found on their page are
            kept.
          </p>
        </div>
      </header>
      <AddAccounts action={addAccounts} owned={ownerOfNew(member.role, member.id) !== null} />
      {reports.length ? (
        <AccountTable reports={reports} member={member} people={people} />
      ) : (
        <div className="table-wrap empty-state">
          <Building2 aria-hidden="true" />
          <p>{EMPTY[view]}</p>
        </div>
      )}
    </AccountsShell>
  );
}
