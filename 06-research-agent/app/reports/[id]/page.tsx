import { Topbar } from "@bootcamp/auth/topbar";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Refresher } from "../../../components/Refresher";
import { ReportView } from "../../../components/ReportView";
import { findReport } from "../../../db/queries";
import { requireUser } from "../../session";

// One report. While the graph runs, the page reloads its data every two seconds to show the next step.
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const report = await findReport(id, user.id);
  if (!report) notFound();
  return (
    <div className="app">
      <Topbar title="Research agent" userName={user.name} />
      <main className="desk">
        <Link href="/" className="back">
          All reports
        </Link>
        <ReportView report={report} />
        {report.status === "running" ? <Refresher /> : null}
      </main>
    </div>
  );
}
