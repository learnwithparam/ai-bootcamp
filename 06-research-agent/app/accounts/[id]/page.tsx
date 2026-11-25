import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountsShell } from "../../../components/AccountsShell";
import { OwnerCell } from "../../../components/OwnerCell";
import { Refresher } from "../../../components/Refresher";
import { ReportView } from "../../../components/ReportView";
import { findReport, teamPeople, viewCounts } from "../../../db/queries";
import { requireMember } from "../../session";

// One account in full: who the company is, its score and why, then every claim with its source.
export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const report = await findReport((await params).id);
  if (!report) notFound();
  const [counts, people] = await Promise.all([viewCounts(member.id), teamPeople()]);
  return (
    <AccountsShell member={member} current={null} counts={counts}>
      {report.status === "running" ? <Refresher /> : null}
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/accounts">All accounts</Link> / {report.identity?.name ?? report.company}
      </nav>
      <ReportView report={report} owner={<OwnerCell report={report} member={member} people={people} />} />
    </AccountsShell>
  );
}
