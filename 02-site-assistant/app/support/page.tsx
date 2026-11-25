import { Topbar } from "@bootcamp/auth/topbar";
import { SupportQueue } from "../../components/SupportQueue";
import { openTickets } from "../../db/queries";
import { requireSupport } from "../session";
import { answerTicket } from "./actions";

// Tickets the assistant handed to a person, oldest first, because they have waited longest.
export default async function SupportPage() {
  const user = await requireSupport();
  const tickets = await openTickets();
  return (
    <div className="app">
      <Topbar title="Ask learnwithparam" userName={user.name} />
      <main className="queue">
        <h1>Support queue</h1>
        <p className="hint">Reply to the visitor by email, then mark the ticket answered.</p>
        <SupportQueue tickets={tickets} answer={answerTicket} />
      </main>
    </div>
  );
}
