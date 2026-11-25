"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { StatusChip } from "@bootcamp/ui/parts";
import Link from "next/link";
import type { DraftCouponOutput } from "../agent/tools/draft-coupon";
import type { ReviseNewsletterOutput } from "../agent/tools/newsletter-edit";
import type { SaveDraftOutput } from "../agent/tools/save-newsletter-draft";

// The cards for tools that save a draft. Each one points at the page where the draft now waits,
// because the work happens on the object, not in the panel.

export const CouponDraftCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as DraftCouponOutput | undefined;
  return (
    <div className="card agent-filled">
      <div className="card-head">
        <span className="label">Discount code drafted</span>
        <StatusChip running={status.type === "running"} />
      </div>
      {output?.drafted ? (
        <div className="card-body">
          <p className="coupon-code">{output.code}</p>
          <p>{output.summary}. It waits for an owner and does not exist in Stripe yet.</p>
          <Link href="/discounts">Open Discounts</Link>
        </div>
      ) : output ? (
        <p className="card-body">{output.problem}</p>
      ) : null}
    </div>
  );
};

export const NewsletterSavedCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as SaveDraftOutput | undefined;
  return (
    <div className="card agent-filled">
      <div className="card-head">
        <span className="label">Newsletter draft saved</span>
        <StatusChip running={status.type === "running"} />
      </div>
      {output ? (
        <div className="card-body">
          <p>
            <strong>{output.subject}</strong>
          </p>
          <Link href={`/newsletters/${output.newsletterId}`}>Open it in the editor</Link>
        </div>
      ) : null}
    </div>
  );
};

export const NewsletterEditCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as ReviseNewsletterOutput | undefined;
  return (
    <div className="card agent-filled">
      <div className="card-head">
        <span className="label">Newsletter edited</span>
        <StatusChip running={status.type === "running"} />
      </div>
      {output?.revised ? (
        <p className="card-body">The editor shows the change. Keep it or undo it there.</p>
      ) : output ? (
        <p className="card-body">{output.problem}</p>
      ) : null}
    </div>
  );
};
