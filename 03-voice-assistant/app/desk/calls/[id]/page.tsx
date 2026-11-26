import { notFound } from "next/navigation";
import { Appointments } from "../../../../components/Appointments";
import { Messages } from "../../../../components/Messages";
import { Refresh } from "../../../../components/Refresh";
import { Transcript } from "../../../../components/Transcript";
import { callTime, cents, duration } from "../../../../components/when";
import { allPhysios } from "../../../../db/diary";
import { bookingsOfCall, type Call, findCall, linesOf, messagesOfCall } from "../../../../db/queries";
import { requireTeam } from "../../../session";

export const dynamic = "force-dynamic";

type Side = {
  bookings: Awaited<ReturnType<typeof bookingsOfCall>>;
  messages: Awaited<ReturnType<typeof messagesOfCall>>;
  physios: Awaited<ReturnType<typeof allPhysios>>;
};

// What the call left behind: the appointments it booked, and any message for the desk.
function CallSide({ bookings, messages, physios }: Side) {
  return (
    <aside className="desk-call-side">
      <section className="panel" aria-labelledby="booked">
        <h2 id="booked" className="panel-head">
          Booked on this call
        </h2>
        <div className="panel-body">
          <Appointments bookings={bookings} physios={physios} />
        </div>
      </section>
      {messages.length > 0 && (
        <section className="panel" aria-labelledby="left">
          <h2 id="left" className="panel-head">
            Message left
          </h2>
          <div className="panel-body">
            <Messages messages={messages.filter((message) => !message.done)} now={new Date()} />
          </div>
        </section>
      )}
    </aside>
  );
}

// The call's time, and either "On the line" or how it ended, how long it was and what it cost.
function CallHeader({ call, live }: { call: Call; live: boolean }) {
  return (
    <header className="page-header">
      <h1>Call, {callTime(call.startedAt, new Date())}</h1>
      <p>
        {live ? (
          <span className="pill pill-wait">On the line</span>
        ) : (
          `${call.endedBecause ?? "Ended"}. ${duration(call.seconds)} long, cost ${cents(call.costUsd)}.`
        )}
      </p>
    </header>
  );
}

// One call: what was said, what the diary answered, what it booked or left for the desk, and what it cost.
export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeam();
  const call = await findCall((await params).id);
  if (!call) notFound();
  const [lines, bookings, messages, physios] = await Promise.all([
    linesOf(call.id),
    bookingsOfCall(call.id),
    messagesOfCall(call.id),
    allPhysios(),
  ]);
  const live = call.status === "live";
  return (
    <>
      {live && <Refresh />}
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="/desk">Today</a>
      </nav>
      <CallHeader call={call} live={live} />
      <div className="desk-call">
        <section className="panel" aria-labelledby="said">
          <h2 id="said" className="panel-head">
            What was said
          </h2>
          <div className="panel-body">
            <Transcript lines={lines} />
          </div>
        </section>
        <CallSide bookings={bookings} messages={messages} physios={physios} />
      </div>
    </>
  );
}
