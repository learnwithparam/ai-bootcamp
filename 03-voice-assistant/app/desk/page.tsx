import type { ReactNode } from "react";
import { Appointments } from "../../components/Appointments";
import { CallsTable } from "../../components/CallsTable";
import { Messages } from "../../components/Messages";
import { allPhysios, bookedBetween } from "../../db/diary";
import { openMessages, recentCalls } from "../../db/queries";
import { addDays, clinicDay, spokenDay } from "../../rules/time";
import { requireTeam } from "../session";

export const dynamic = "force-dynamic";

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="panel-head">
        {title}
      </h2>
      <div className="panel-body">{children}</div>
    </section>
  );
}

// What the front desk opens first: today's diary, who wants a call back, and the calls the phone took.
export default async function TodayPage() {
  await requireTeam();
  const now = new Date();
  const today = clinicDay(now);
  const [bookings, physios, messages, calls] = await Promise.all([
    bookedBetween(today, addDays(today, 1)),
    allPhysios(),
    openMessages(),
    recentCalls(),
  ]);
  return (
    <>
      <header className="page-header">
        <h1>Today</h1>
        <p>{spokenDay(today)}</p>
      </header>
      <div className="desk-today">
        <Panel id="today-diary" title="Appointments today">
          <Appointments bookings={bookings} physios={physios} />
        </Panel>
        <Panel id="call-backs" title="Call backs">
          <Messages messages={messages} now={now} />
        </Panel>
      </div>
      <section className="desk-calls" aria-labelledby="calls">
        <h2 id="calls">Phone calls</h2>
        <CallsTable calls={calls} now={now} />
      </section>
    </>
  );
}
