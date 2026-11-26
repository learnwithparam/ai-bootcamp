"use client";

import { AISLES, aisleName } from "../../rules/catalog";
import type { Section } from "../../rules/sections";
import { ProductCard } from "../ProductCard";

type Added = (basket: { count: number; totalPence: number }) => void;

// The registry, drawn: one component per kind of section the agent may ask for. A kind not here cannot reach the page,
// because rules/layout.ts only lets through the kinds in rules/sections.ts.

function Hero({ section, onAdded }: { section: Extract<Section, { type: "hero" }>; onAdded: Added }) {
  return (
    <section className="hero" aria-label={section.headline}>
      <div>
        <h2>{section.headline}</h2>
        <p className="hero-subline">{section.subline}</p>
      </div>
      <ProductCard product={section.product} onAdded={onAdded} />
    </section>
  );
}

function Row({
  section,
  onAdded,
}: {
  section: Extract<Section, { type: "productRow" | "bundle" }>;
  onAdded: Added;
}) {
  return (
    <section className={section.type === "bundle" ? "row bundle" : "row"} aria-label={section.title}>
      <header>
        <h2>{section.title}</h2>
        <p className="reason">{section.reason}</p>
      </header>
      <div className="shelf">
        {section.products.map((product) => (
          <ProductCard key={product.code} product={product} onAdded={onAdded} />
        ))}
      </div>
    </section>
  );
}

function Recipe({ section, onAdded }: { section: Extract<Section, { type: "recipeCard" }>; onAdded: Added }) {
  return (
    <section className="recipe" aria-label={section.title}>
      <div>
        <h2>{section.title}</h2>
        <ol>
          {section.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="shelf">
        {section.products.map((product) => (
          <ProductCard key={product.code} product={product} onAdded={onAdded} />
        ))}
      </div>
    </section>
  );
}

// The aisle bar filters the page in place: no model call, just the shopper narrowing what they see.
function Aisles({
  section,
  picked,
  onPick,
}: {
  section: Extract<Section, { type: "filterBar" }>;
  picked: string | null;
  onPick: (aisle: string | null) => void;
}) {
  const known = section.aisles.filter((aisle) => (AISLES as readonly string[]).includes(aisle));
  return (
    <nav className="aisles" aria-label="Aisles">
      <button type="button" className="aisle" aria-pressed={picked === null} onClick={() => onPick(null)}>
        Everything
      </button>
      {known.map((aisle) => (
        <button
          key={aisle}
          type="button"
          className="aisle"
          aria-pressed={picked === aisle}
          onClick={() => onPick(aisle)}
        >
          {aisleName(aisle)}
        </button>
      ))}
    </nav>
  );
}

type ViewProps = {
  section: Section;
  onAdded: Added;
  picked: string | null;
  onPick: (aisle: string | null) => void;
};

export function SectionView({ section, onAdded, picked, onPick }: ViewProps) {
  if (section.type === "hero") return <Hero section={section} onAdded={onAdded} />;
  if (section.type === "filterBar") return <Aisles section={section} picked={picked} onPick={onPick} />;
  if (section.type === "recipeCard") return <Recipe section={section} onAdded={onAdded} />;
  return <Row section={section} onAdded={onAdded} />;
}
