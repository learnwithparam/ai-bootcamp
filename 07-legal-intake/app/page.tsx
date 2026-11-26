import Link from "next/link";
import { FirmHeader } from "../components/FirmHeader";
import { HANDLED, PRACTICE_AREAS } from "../rules/intake";

const AREAS = [
  { name: "Employment", text: "Dismissal, unpaid wages, discrimination, and grievances at work." },
  { name: "Tenancy", text: "Deposits, repairs, rent increases, and notices to leave your home." },
  { name: "Consumer", text: "Faulty goods, refunds refused, and contracts you were mis-sold." },
];

const STEPS = [
  {
    title: "Tell us what happened",
    text: "Write as you would to a friend. Our assistant asks only what a lawyer needs and fills in the form beside you.",
  },
  {
    title: "Check the form and send it",
    text: "Every field is yours to change. Nothing reaches the firm until you press Send request.",
  },
  {
    title: "A lawyer writes back",
    text: "A lawyer reads every request and approves every letter. Your request page shows where it is.",
  },
];

const declined = new Intl.ListFormat("en-GB", { type: "disjunction" }).format(
  PRACTICE_AREAS.filter((area) => !HANDLED.includes(area) && area !== "other"),
);

function HowItWorks() {
  return (
    <section className="firm-steps" aria-labelledby="how-heading">
      <h2 id="how-heading">What happens when you write to us</h2>
      <ol>
        {STEPS.map((step) => (
          <li key={step.title}>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="firm-declined">
        We do not take {declined} matters. If yours is one, our reply says so and suggests where to find help.
      </p>
    </section>
  );
}

// The firm's public home. One job: get someone with a problem to tell us about it.
export default function Home() {
  return (
    <div className="firm">
      <FirmHeader />
      <main className="firm-home">
        <section className="firm-hero">
          <h1>Trouble at work, at home or with a company?</h1>
          <p>
            Tell us what happened in your own words. Our assistant asks what a lawyer needs to know and fills
            in the form with you. A lawyer reads every request and writes back.
          </p>
          <Link href="/intake" className="button button-firm">
            Tell us what happened
          </Link>
        </section>
        <section className="firm-areas-list" aria-label="What we help with">
          {AREAS.map((area) => (
            <article key={area.name}>
              <h2>{area.name}</h2>
              <p>{area.text}</p>
            </article>
          ))}
        </section>
        <HowItWorks />
      </main>
    </div>
  );
}
