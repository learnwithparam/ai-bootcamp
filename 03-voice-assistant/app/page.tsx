import { Phone } from "../components/Phone";
import { HOURS, WEEKDAYS } from "../rules/clinic";
import { spokenTime } from "../rules/time";

// The clinic's own page, as a patient finds it. The phone answers itself; the people are with patients.
const DAYS = [1, 2, 3, 4, 5, 6, 0];

export default function CallerPage() {
  return (
    <main className="clinic">
      <header className="clinic-head">
        <p className="clinic-name">Harbour Physio</p>
        <a className="clinic-staff" href="/desk">
          Front desk
        </a>
      </header>
      <section className="clinic-intro">
        <h1>Book a physio appointment by phone, any time.</h1>
        <p>
          Our phone line books you straight into the diary, finds or cancels your appointment, and takes a
          message for anything else. A person reads every call the same day.
        </p>
        <table className="clinic-hours">
          <caption>Opening hours</caption>
          <tbody>
            {DAYS.map((day) => {
              const hours = HOURS[day];
              return (
                <tr key={day}>
                  <th scope="row">{WEEKDAYS[day]}</th>
                  <td>{hours ? `${spokenTime(hours.opens)} to ${spokenTime(hours.closes)}` : "Closed"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="clinic-emergency">In an emergency, call 999. This line cannot help with urgent care.</p>
      </section>
      <Phone />
    </main>
  );
}
