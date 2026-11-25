import { Topbar } from "@bootcamp/auth/topbar";
import { ReportList } from "../components/ReportList";
import { ResearchForm } from "../components/ResearchForm";
import { reportsBy } from "../db/queries";
import { startResearch } from "./actions";
import { requireUser } from "./session";

// Type a company, get a report. Your earlier reports are listed below, newest first.
export default async function HomePage() {
  const user = await requireUser();
  const reports = await reportsBy(user.id);
  return (
    <div className="app">
      <Topbar title="Research agent" userName={user.name} />
      <main className="desk">
        <ResearchForm action={startResearch} />
        <ReportList reports={reports} />
      </main>
    </div>
  );
}
