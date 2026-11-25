import { Topbar } from "@bootcamp/auth/topbar";
import { QueueList } from "../../components/QueueList";
import { Refresher } from "../../components/Refresher";
import { RUNNING } from "../../components/StatusChip";
import { queue } from "../../db/queries";
import { requireLawyer } from "../session";

// The lawyers' queue: every request, newest first, with what it waits for.
export default async function QueuePage() {
  const lawyer = await requireLawyer();
  const intakes = await queue();
  return (
    <div className="app">
      <Topbar title="Legal intake" userName={lawyer.name} />
      <main className="desk">
        <h1>Review queue</h1>
        <QueueList intakes={intakes} />
        {intakes.some((intake) => RUNNING.includes(intake.status)) ? <Refresher /> : null}
      </main>
    </div>
  );
}
