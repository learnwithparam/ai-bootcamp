import { notFound } from "next/navigation";
import { personalization } from "../../../db/queries";
import { aisleName, pounds } from "../../../rules/catalog";
import { chips } from "../../../rules/profile";
import { type Removed, SECTION_LABEL, type Section } from "../../../rules/sections";
import { requireTeam } from "../../session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function names(section: Section): string {
  if (section.type === "filterBar") return section.aisles.map(aisleName).join(", ");
  if (section.type === "hero") return section.product.name;
  return section.products.map((product) => product.name).join(", ");
}

const titleOf = (section: Section) =>
  section.type === "hero" ? section.headline : section.type === "filterBar" ? "Aisle bar" : section.title;
const keyOf = (one: Removed) => [one.code, one.why].join(" ");

function LaidOut({ sections }: { sections: Section[] }) {
  return (
    <ol className="laid-out">
      {sections.map((section) => (
        <li key={section.id}>
          <strong>{titleOf(section)}</strong>{" "}
          <span className="pill pill-agent">{SECTION_LABEL[section.type]}</span>
          <p>{names(section)}</p>
        </li>
      ))}
    </ol>
  );
}

// Every product the agent chose that the rules would not show, and every section they dropped whole.
function TakenOut({ removed, dropped }: { removed: Removed[]; dropped: string[] }) {
  return removed.length === 0 && dropped.length === 0 ? (
    <p>Nothing. Every product the agent chose was one this shopper may have.</p>
  ) : (
    <ul className="taken-out">
      {removed.map((one) => (
        <li key={keyOf(one)}>
          {one.name}: {one.why}
        </li>
      ))}
      {dropped.map((one) => (
        <li key={one}>A whole section, {one}</li>
      ))}
    </ul>
  );
}

// One personalization in full: the profile the agent worked from, each section it drew, and every product the rules took out.
export default async function PersonalizationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeam();
  const { id } = await params;
  const row = UUID.test(id) ? await personalization(id) : null;
  if (!row) notFound();
  const known = chips(row.profile).map((chip) => chip.label);
  return (
    <>
      <nav className="crumbs">
        <a href="/merchandising">Personalizations</a>
      </nav>
      <header className="page-header">
        <h1>{row.said}</h1>
        <p>
          {row.reply} Took {row.seconds.toFixed(1)} s and cost ${row.costUsd.toFixed(4)}.
        </p>
      </header>
      <p className="beliefs">{known.length > 0 ? known.join(", ") : "Nothing known about this shopper."}</p>
      <h2>The page the agent laid out</h2>
      <LaidOut sections={row.sections} />
      <h2>Taken out by the rules</h2>
      <TakenOut removed={row.removed} dropped={row.dropped} />
      {row.proposal && (
        <>
          <h2>Basket proposed: {row.basket}</h2>
          <p>
            {row.proposal.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ")}. Total{" "}
            {pounds(row.proposal.totalPence)}.
          </p>
        </>
      )}
    </>
  );
}
