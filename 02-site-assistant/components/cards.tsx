"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { StatusChip } from "@bootcamp/ui/parts";
import type { PortalOutput } from "../agent/tools/billing-portal";
import type { HandOffOutput } from "../agent/tools/hand-off";
import type { PlanOutput } from "../agent/tools/my-plan";
import type { SearchOutput } from "../agent/tools/search-site";
import { formatPrice } from "../rules/price";

// One card per tool, so the visitor sees what the assistant looked up, not only what it wrote.

const SITE = "https://www.learnwithparam.com";

export const SourcesCard: ToolCallMessagePartComponent = ({ args, result, status }) => {
  const sources = (result as SearchOutput | undefined)?.sources ?? [];
  return (
    <details className="card thinking">
      <summary className="card-head">
        <span className="label">Searched the site</span>
        <span>{typeof args?.query === "string" ? args.query : ""}</span>
        <StatusChip running={status.type === "running"} />
      </summary>
      <div className="card-body">
        <ul className="sources">
          {sources.map((source) => (
            <li className="source" key={source.number}>
              <span className="source-id">[{source.number}]</span>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
              <span className="source-meta">
                {[source.url.replace(SITE, "") || "/", source.heading].filter(Boolean).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
};

export const PlanCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as PlanOutput | undefined;
  if (!output) return <StatusChip running={status.type === "running"} />;
  if (!output.signedIn) return <div className="card card-body">Sign in to see your plan.</div>;
  if (!output.plan) return <div className="card card-body">There is no paid plan on this account.</div>;
  const { plan } = output;
  return (
    <div className="card">
      <div className="card-head">
        <span className="label">Your plan</span>
        <span className="status status-pass">{plan.status}</span>
      </div>
      <dl className="card-body plan">
        <dt>Plan</dt>
        <dd>{plan.name}</dd>
        <dt>Price</dt>
        <dd>{formatPrice(plan.amountCents, plan.currency, plan.interval)}</dd>
        <dt>{plan.endsAtRenewal ? "Ends" : "Renews"}</dt>
        <dd>{plan.renewsOn}</dd>
      </dl>
    </div>
  );
};

// Stripe's portal opens in a new tab, so the conversation stays where it was.
export const BillingCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as PortalOutput | undefined;
  if (!output) return <StatusChip running={status.type === "running"} />;
  if (!output.signedIn) return <div className="card card-body">Sign in to manage billing.</div>;
  if (!output.url) return <div className="card card-body">There is no billing on this account yet.</div>;
  return (
    <div className="card card-body">
      <a className="button button-primary" href={output.url} target="_blank" rel="noreferrer">
        Manage billing
      </a>
    </div>
  );
};

export const HandOffCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as HandOffOutput | undefined;
  if (!output) return <StatusChip running={status.type === "running"} />;
  if (!output.opened) return null;
  return (
    <div className="card handed-off">
      <div className="card-head">
        <span className="label">Passed to a person</span>
        <span>Ticket {output.ticket}</span>
      </div>
      <div className="card-body">A person on the team will reply to {output.email}.</div>
    </div>
  );
};
