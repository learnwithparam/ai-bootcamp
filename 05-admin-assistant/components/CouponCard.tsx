"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { StatusChip } from "@bootcamp/ui/parts";
import { useState } from "react";
import type { CreateCouponOutput } from "../agent/tools/create-coupon";
import { type CouponRequest, couponProblem, describeCoupon } from "../rules/coupon";

type Made = Extract<CreateCouponOutput, { made: true }>;

function MadeCard({ output }: { output: Made }) {
  return (
    <div className="card coupon-made">
      <div className="card-head">
        <span className="label">Code made in Stripe</span>
        <span className="status status-pass">live in test mode</span>
      </div>
      <div className="card-body">
        <p className="coupon-code">{output.code}</p>
        <p>{output.summary}.</p>
        <a href={output.link} target="_blank" rel="noreferrer">
          Open it in Stripe
        </a>
      </div>
    </div>
  );
}

// The two buttons. A failed answer is shown on the card, and the buttons come back.
function Decide({ respond }: { respond: (answer: { approved: boolean; reason?: string }) => Promise<void> }) {
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function answer(approved: boolean) {
    setSending(true);
    setFailure(null);
    try {
      await respond({ approved, ...(approved ? {} : { reason: "The owner said no." }) });
    } catch (error) {
      console.error("The approval answer was not sent", error);
      setFailure("Your answer was not recorded. Try again.");
      setSending(false);
    }
  }

  return (
    <>
      <div className="approve-row">
        <button
          type="button"
          className="button button-primary"
          disabled={sending}
          onClick={() => answer(true)}
        >
          Approve and make it
        </button>
        <button type="button" className="button" disabled={sending} onClick={() => answer(false)}>
          Do not make it
        </button>
      </div>
      {failure ? <p className="chat-error">{failure}</p> : null}
    </>
  );
}

// The card that stops the assistant until the owner decides. Approving sends back a signed approval
// for this exact coupon; the server makes it only if the signature and the limits both hold.
export const CouponCard: ToolCallMessagePartComponent = ({
  args,
  result,
  status,
  approval,
  respondToApproval,
}) => {
  const request = args as CouponRequest;
  const output = result as CreateCouponOutput | undefined;
  const problem = couponProblem(request);
  if (output?.made) return <MadeCard output={output} />;
  return (
    <div className="card coupon-ask">
      <div className="card-head">
        <span className="label">Make this discount code?</span>
        {approval?.approved === false ? <span className="status status-fail">you said no</span> : null}
        {approval?.approved === true && !output ? <StatusChip running={status.type === "running"} /> : null}
      </div>
      <div className="card-body">
        <p className="coupon-code">{request.code}</p>
        <p>{describeCoupon(request)}.</p>
        {problem ? <p className="chat-error">{problem} It will be refused even if you approve it.</p> : null}
        {output && !output.made ? <p className="chat-error">{output.problem}</p> : null}
        {approval?.approved === undefined ? <Decide respond={respondToApproval} /> : null}
      </div>
    </div>
  );
};
