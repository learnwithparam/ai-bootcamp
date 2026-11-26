import { DeskShell } from "../../components/DeskShell";
import { HistoryTable } from "../../components/HistoryTable";
import { failStalled, inbox, runHistory } from "../../db/queries";
import { counts } from "../../rules/team";
import { requireOperator } from "../session";

// Every run the agent made, newest first: what happened, who decided, and what it cost.
export default async function HistoryPage() {
  const person = await requireOperator();
  await failStalled();
  const [rows, all] = await Promise.all([runHistory(), inbox()]);
  return (
    <DeskShell person={person} current="history" counts={counts(all)}>
      <header className="page-header">
        <div>
          <h1>Run history</h1>
          <p>Every time the agent worked on an email, and who made the last call.</p>
        </div>
      </header>
      <HistoryTable rows={rows} />
    </DeskShell>
  );
}
