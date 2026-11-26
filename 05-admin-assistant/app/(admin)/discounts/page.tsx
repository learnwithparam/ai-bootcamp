import { Sparkles, TicketPercent } from "lucide-react";
import { AskButton } from "../../../components/AskButton";
import { listCodes } from "../../../db/coupons";
import { openDiscountDrafts } from "../../../db/discounts";
import type { DiscountDraft, Role } from "../../../db/schema";
import { describeCoupon } from "../../../rules/coupon";
import { requireTeam } from "../../session";
import { approveDiscount, discardDiscount } from "./actions";

const length = (duration: string, months: number | null) =>
  duration === "repeating" ? `${months} months` : duration === "once" ? "First payment" : duration;

function DraftRow({ draft, role }: { draft: DiscountDraft; role: Role }) {
  const request = {
    code: draft.code,
    percentOff: draft.percentOff,
    duration: draft.duration,
    months: draft.months ?? undefined,
  };
  return (
    <li className="draft-row agent-filled">
      <div>
        <span className="pill pill-agent">
          <Sparkles aria-hidden="true" /> Drafted by the assistant
        </span>
        <p className="coupon-code">{draft.code}</p>
        <p>{describeCoupon(request)}.</p>
        {draft.problem ? <p className="pill pill-fail">{draft.problem}</p> : null}
      </div>
      {draft.status === "making" ? (
        <span className="pill pill-wait">Making it in Stripe</span>
      ) : role === "owner" ? (
        <div className="page-actions">
          <form action={discardDiscount}>
            <input type="hidden" name="id" value={draft.id} />
            <button type="submit" className="button button-quiet">
              Discard
            </button>
          </form>
          <form action={approveDiscount}>
            <input type="hidden" name="id" value={draft.id} />
            <button type="submit" className="button button-primary">
              Approve and make it
            </button>
          </form>
        </div>
      ) : (
        <span className="pill pill-wait">Waiting for an owner</span>
      )}
    </li>
  );
}

function CodesTable({ codes }: { codes: Awaited<ReturnType<typeof listCodes>> }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Lasts</th>
            <th className="num">Used</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((code) => (
            <tr key={code.id}>
              <td>
                <code>{code.code}</code>
              </td>
              <td>{code.percentOff === null ? "" : `${code.percentOff}% off`}</td>
              <td>{length(code.duration, code.months)}</td>
              <td className="num">{code.timesUsed}</td>
              <td>
                {code.active ? (
                  <span className="pill pill-pass">Active</span>
                ) : (
                  <span className="pill">Switched off</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Discounts() {
  const member = await requireTeam();
  const [drafts, codes] = await Promise.all([openDiscountDrafts(), listCodes(50)]);
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Discounts</h1>
          <p>Codes customers type at checkout. They live in Stripe, at most 50% off for at most 12 months.</p>
        </div>
        <AskButton
          prompt="Make a 20% code for the first payment."
          label="Draft a code"
          className="button page-actions"
        />
      </header>
      <section className="panel" aria-labelledby="waiting">
        <h2 className="panel-head" id="waiting">
          Drafts to approve
        </h2>
        {drafts.length ? (
          <ul className="drafts">
            {drafts.map((draft) => (
              <DraftRow key={draft.id} draft={draft} role={member.role} />
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            <TicketPercent aria-hidden="true" /> Nothing waits. Ask the assistant for a code and it appears
            here.
          </p>
        )}
      </section>
      <h2>In Stripe</h2>
      <CodesTable codes={codes} />
    </>
  );
}
