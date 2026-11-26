import { cancelAppointment } from "../app/desk/actions";
import type { Physio } from "../rules/slots";
import { appointmentTime } from "./when";

export type AppointmentRow = {
  id: string;
  start: Date;
  physioId: string;
  callerName: string;
  reason: string;
  callId: string | null;
  bookedBy: string;
};

// A list of booked appointments, each with who booked it. One the phone booked links to its call.
export function Appointments({ bookings, physios }: { bookings: AppointmentRow[]; physios: Physio[] }) {
  if (bookings.length === 0) return <p className="empty-state">Nothing booked.</p>;
  const name = (id: string) => physios.find((physio) => physio.id === id)?.name ?? id;
  return (
    <ul className="appointments">
      {bookings.map((booking) => (
        <li key={booking.id} className="appointment" data-booked-by={booking.bookedBy}>
          <p className="appointment-time">{appointmentTime(booking.start)}</p>
          <p className="appointment-who">
            {booking.callerName} with {name(booking.physioId)}
          </p>
          <p className="appointment-reason">{booking.reason}</p>
          <p className="appointment-source">
            {booking.callId ? (
              <a href={`/desk/calls/${booking.callId}`}>Booked by phone</a>
            ) : (
              "Booked at the front desk"
            )}
          </p>
          <form action={cancelAppointment.bind(null, booking.id)}>
            <button type="submit" className="button button-quiet">
              Cancel
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
