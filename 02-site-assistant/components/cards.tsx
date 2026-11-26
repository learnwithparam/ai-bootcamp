"use client";

import { type ToolCallMessagePartComponent, useAuiState } from "@assistant-ui/react";
import { StatusChip } from "@bootcamp/ui/parts";
import type { PortalOutput } from "../agent/tools/billing-portal";
import type { HandOffOutput } from "../agent/tools/hand-off";
import type { PlanOutput } from "../agent/tools/my-plan";
import type { SearchOutput } from "../agent/tools/search-site";
import { pagesRead } from "../rules/citations";
import { formatPrice } from "../rules/price";

// One card per tool, so the visitor sees what the assistant looked up, not only what it wrote.

const SITE = "https://www.learnwithparam.com";

// The pages behind the answer, as small numbered links. The [n] in the reply points at the same number.
// The assistant may search more than once; the first search shows every page read, the others nothing.
type Part = { type: string; text?: string; toolName?: string; toolCallId?: string; result?: unknown };

export const SourcesCard: ToolCallMessagePartComponent = ({ toolCallId, status }) => {
  const parts = useAuiState((state) => state.message.parts) as readonly Part[];
  const searches = parts.filter((part) => part.type === "tool-call" && part.toolName === "search_site");
  if (searches[0]?.toolCallId !== toolCallId) return null;
  if (status.type === "running") return <p className="looking">Looking through the site...</p>;
  const answer = parts.map((part) => (part.type === "text" ? part.text : "")).join(" ");
  const sources = searches.flatMap((part) => (part.result as SearchOutput | undefined)?.sources ?? []);
  const pages = pagesRead(sources, answer);
  if (pages.length === 0) return null;
  return (
    <details className="sources-fold">
      <summary>{pages.length === 1 ? "1 source" : `${pages.length} sources`}</summary>
      <ul className="source-chips">
        {pages.map((page) => (
          <li key={page.url}>
            <a className="source-chip" href={page.url} target="_blank" rel="noreferrer">
              {page.numbers.length > 0 ? (
                <span className="source-number">{page.numbers.join(", ")}</span>
              ) : null}
              <span className="source-title">{page.title.split(" | ")[0]}</span>
              <span className="source-path">{page.url.replace(SITE, "") || "/"}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
};

export const PlanCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as PlanOutput | undefined;
  if (!output) return <StatusChip running={status.type === "running"} />;
  if (!output.signedIn) return <p className="member-note">Sign in to see your plan.</p>;
  if (!output.plan) return <p className="member-note">There is no paid plan on this account.</p>;
  const { plan } = output;
  return (
    <section className="member-card" aria-label="Your plan">
      <header>
        <strong>{plan.name}</strong>
        <span className="status status-pass">{plan.status}</span>
      </header>
      <dl className="plan">
        <dt>Price</dt>
        <dd>{formatPrice(plan.amountCents, plan.currency, plan.interval)}</dd>
        <dt>{plan.endsAtRenewal ? "Ends" : "Renews"}</dt>
        <dd>{plan.renewsOn}</dd>
      </dl>
    </section>
  );
};

// Stripe's portal opens in a new tab, so the conversation stays where it was.
export const BillingCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as PortalOutput | undefined;
  if (!output) return <StatusChip running={status.type === "running"} />;
  if (!output.signedIn) return <p className="member-note">Sign in to manage billing.</p>;
  if (!output.url) return <p className="member-note">There is no billing on this account yet.</p>;
  return (
    <p className="member-action">
      <a className="button button-primary" href={output.url} target="_blank" rel="noreferrer">
        Manage billing
      </a>
      <span>Opens Stripe in a new tab</span>
    </p>
  );
};

// The visitor sees that a person has it now, and where the reply will arrive.
export const HandOffCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as HandOffOutput | undefined;
  if (!output) return <StatusChip running={status.type === "running"} />;
  if (!output.opened) return null;
  return (
    <div className="handed-off" role="status">
      <strong>Passed to the support team</strong>
      <span>A person will reply in this conversation. The team can also write to {output.email}.</span>
    </div>
  );
};
