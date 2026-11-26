import { enabledTypes, recentPersonalizations } from "../../db/queries";
import { SECTION_LABEL, SECTION_TYPES, type SectionType } from "../../rules/sections";
import { requireTeam } from "../session";
import { setSectionType } from "./actions";

export const dynamic = "force-dynamic";

const when = (date: Date) => `${new Date(date).toISOString().slice(0, 16).replace("T", " ")} UTC`;
const who = (owner: string) => (owner.startsWith("user:") ? "Signed in" : "Guest");
const BASKET = {
  none: null,
  waiting: "Basket waiting",
  added: "Basket added",
  declined: "Basket declined",
} as const;

// The merchandiser's switches: the agent may only lay out the kinds of section turned on here.
function SectionTypes({ enabled }: { enabled: SectionType[] }) {
  return (
    <section className="types" aria-label="Sections the agent may use">
      <h2>Sections the agent may use</h2>
      {SECTION_TYPES.map((type) => {
        const on = enabled.includes(type);
        return (
          <form key={type} action={setSectionType.bind(null, type, !on)}>
            <button type="submit" className={on ? "button" : "button button-quiet"} aria-pressed={on}>
              {SECTION_LABEL[type]}: {on ? "on" : "off"}
            </button>
          </form>
        );
      })}
    </section>
  );
}

type Row = Awaited<ReturnType<typeof recentPersonalizations>>[number];

function Personalizations({ rows }: { rows: Row[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>Shopper</th>
            <th>They said</th>
            <th>Sections</th>
            <th>Taken out</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{when(row.createdAt)}</td>
              <td>{who(row.owner)}</td>
              <td>
                <a href={`/merchandising/${row.id}`}>{row.said}</a>{" "}
                {BASKET[row.basket] && <span className="pill pill-info">{BASKET[row.basket]}</span>}
              </td>
              <td>{row.sections.length}</td>
              <td>
                {row.removed.length > 0 ? <span className="pill pill-wait">{row.removed.length}</span> : 0}
              </td>
              <td>${row.costUsd.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Every page the agent laid out, newest first: what the shopper said, what the rules took out, and what it cost.
export default async function MerchandisingPage() {
  await requireTeam();
  const [rows, enabled] = await Promise.all([recentPersonalizations(), enabledTypes()]);
  return (
    <>
      <header className="page-header">
        <h1>Personalizations</h1>
        <p>Each time a shopper told the shop how they shop, and the page the agent laid out for them.</p>
      </header>
      <SectionTypes enabled={enabled} />
      {rows.length === 0 ? (
        <p>No shopper has asked yet. Open the shop and tell it how you shop.</p>
      ) : (
        <Personalizations rows={rows} />
      )}
    </>
  );
}
