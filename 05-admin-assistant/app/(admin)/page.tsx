import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AskButton } from "../../components/AskButton";
import { SignupsChart } from "../../components/SignupsChart";
import { listCodes } from "../../db/coupons";
import { openDiscountDrafts } from "../../db/discounts";
import { newsletterFacts } from "../../db/newsletters";
import { accountCount, signupsByDay } from "../../db/queries";
import { everyDay, todayUtc } from "../../rules/days";
import { pulse, type Suggestion, weekChange } from "../../rules/pulse";
import { requireTeam } from "../session";
import { nextLab } from "./upcoming";

const sum = (days: { signups: number }[]) => days.reduce((total, day) => total + day.signups, 0);

async function facts() {
  const [counts, accounts, codes, drafts, letters, upcoming] = await Promise.all([
    signupsByDay(90),
    accountCount(),
    listCodes(),
    openDiscountDrafts(),
    newsletterFacts(),
    nextLab(),
  ]);
  const days = everyDay(counts, 90, todayUtc());
  return { days, accounts, codes, drafts, letters, upcoming };
}

function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {note ? <span className="metric-note">{note}</span> : null}
    </div>
  );
}

function Suggestions({ items, problem }: { items: Suggestion[]; problem: string | null }) {
  return (
    <section className="panel" aria-labelledby="pulse">
      <h2 className="panel-head" id="pulse">
        Suggested for you
      </h2>
      <div className="panel-body">
        {items.length === 0 ? <p className="hint">Nothing needs you right now.</p> : null}
        <ul className="pulse">
          {items.map((item) => (
            <li key={item.id} className="pulse-item">
              <strong>{item.title}</strong>
              <p>{item.why}</p>
              {"href" in item ? (
                <Link className="button" href={item.href}>
                  Open <ArrowUpRight aria-hidden="true" />
                </Link>
              ) : (
                <AskButton prompt={item.ask} label="Ask the assistant" />
              )}
            </li>
          ))}
        </ul>
        {problem ? <p className="hint">{problem}</p> : null}
      </div>
    </section>
  );
}

const changeNote = (change: number | null) =>
  change === null ? "none the week before" : `${change > 0 ? "+" : ""}${change}% on the week before`;

function ChartPanel({ days }: { days: Awaited<ReturnType<typeof facts>>["days"] }) {
  return (
    <section className="panel" aria-labelledby="chart">
      <h2 className="panel-head" id="chart">
        Signups per day, last 90 days
      </h2>
      <div className="panel-body">
        <SignupsChart days={days} />
      </div>
    </section>
  );
}

export default async function Home() {
  const member = await requireTeam();
  const { days, accounts, codes, drafts, letters, upcoming } = await facts();
  const thisWeek = sum(days.slice(-7));
  const lastWeek = sum(days.slice(-14, -7));
  const activeCodes = codes.filter((code) => code.active).length;
  const suggestions = pulse({
    signupsThisWeek: thisWeek,
    signupsLastWeek: lastWeek,
    discountDraftsWaiting: drafts.length,
    newsletterDraftsWaiting: letters.waiting,
    daysSinceLastNewsletter: letters.daysSince,
    nextLab: upcoming.lab,
    activeCodes,
  });
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Good to see you, {member.name.split(" ")[0]}</h1>
          <p>Here is how the school is doing today.</p>
        </div>
      </header>
      <section className="metrics" aria-label="Today">
        <Metric
          label="Signups, last 7 days"
          value={thisWeek}
          note={changeNote(weekChange(thisWeek, lastWeek))}
        />
        <Metric label="Signups, last 30 days" value={sum(days.slice(-30))} />
        <Metric label="Accounts" value={accounts} />
        <Metric label="Active discount codes" value={activeCodes} />
      </section>
      <div className="home-grid">
        <Suggestions items={suggestions} problem={upcoming.problem} />
        <ChartPanel days={days} />
      </div>
    </>
  );
}
