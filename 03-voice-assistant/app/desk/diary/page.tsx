import { Appointments } from "../../../components/Appointments";
import { allPhysios, bookedBetween } from "../../../db/diary";
import { addDays, clinicDay, spokenDay } from "../../../rules/time";
import { requireTeam } from "../../session";

export const dynamic = "force-dynamic";

// The coming week, day by day, as the phone and the desk have booked it.
export default async function DiaryPage() {
  await requireTeam();
  const today = clinicDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [bookings, physios] = await Promise.all([bookedBetween(today, addDays(today, 7)), allPhysios()]);
  return (
    <>
      <header className="page-header">
        <h1>Diary</h1>
        <p>
          {spokenDay(today)} to {spokenDay(addDays(today, 6))}. {bookings.length} booked.
        </p>
      </header>
      <div className="diary">
        {days.map((day) => {
          const ofDay = bookings.filter((booking) => clinicDay(booking.start) === day);
          return (
            <section key={day} className="panel" aria-label={spokenDay(day)}>
              <h2 className="panel-head">{spokenDay(day)}</h2>
              <div className="panel-body">
                <Appointments bookings={ofDay} physios={physios} />
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
