import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity } from "../../../components/Activity";
import { ApprovePanel } from "../../../components/ApprovePanel";
import { BillPill } from "../../../components/BillPill";
import { BillReader } from "../../../components/BillReader";
import { BillsShell } from "../../../components/BillsShell";
import { MatchTable } from "../../../components/MatchTable";
import { Refresher } from "../../../components/Refresher";
import { ReviewPanel } from "../../../components/ReviewPanel";
import { rowOf } from "../../../components/rows";
import { activityOf, findBill, statusCounts } from "../../../db/bills";
import { findOrder } from "../../../db/queries";
import { type BillRecord, may, TABS, type Tab } from "../../../rules/bill";
import { fieldSummary } from "../../../rules/locate";
import { type Member, requireMember } from "../../session";

const tabOf = (status: BillRecord["status"]): Tab =>
  (["review", "approval", "payment", "paid"] as const).find((tab) =>
    (TABS[tab].statuses as readonly string[]).includes(status),
  ) ?? "all";

function Problems({ bill }: { bill: BillRecord }) {
  if (bill.problems.length === 0) return null;
  return (
    <section className="panel" aria-label="What does not match">
      <div className="panel-head">
        <h2>What does not match</h2>
      </div>
      <ul className="panel-body problem-list">
        {bill.problems.map((problem) => (
          <li key={problem.message}>{problem.message}</li>
        ))}
      </ul>
      {bill.duplicateOf ? (
        <p className="panel-note">
          <Link href={`/bills/${bill.duplicateOf}`}>Open the copy that arrived first</Link>
        </p>
      ) : null}
    </section>
  );
}

function Decide({ bill, member, row }: { bill: BillRecord; member: Member; row: ReturnType<typeof rowOf> }) {
  const paying = row.paying ?? row.amount;
  if (bill.status === "review" || bill.status === "hold" || bill.status === "unreadable")
    return <ReviewPanel id={bill.id} status={bill.status} fix={bill.fix} billed={row.amount} />;
  if ((bill.status === "approval" || bill.status === "payment") && may(member.role, "approve"))
    return <ApprovePanel id={bill.id} stage={bill.status} paying={paying} />;
  if (bill.status === "approval")
    return <p className="panel-note">Waiting for a finance approver to sign it off.</p>;
  return null;
}

function Header({ bill, row, tab }: { bill: BillRecord; row: ReturnType<typeof rowOf>; tab: Tab }) {
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href={`/bills?tab=${tab}`}>{TABS[tab].label}</Link> / Bill {row.number}
      </nav>
      <header className="page-header">
        <div>
          <h1>
            Bill {row.number} <BillPill status={bill.status} />
          </h1>
          <p>
            Northwind Traders to {row.billedTo}. {row.amount ? `${row.amount} billed. ` : ""}
            Received {row.received}
            {row.due ? `, ${row.due.text.toLowerCase()}` : ""}.
          </p>
        </div>
      </header>
    </>
  );
}

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const bill = await findBill((await params).id);
  if (!bill) notFound();
  const [events, counts, order] = await Promise.all([
    activityOf(bill.id),
    statusCounts(),
    bill.extracted ? findOrder(Number(bill.extracted.invoiceNumber)) : undefined,
  ]);
  const row = rowOf(bill, new Date());
  const tab = tabOf(bill.status);
  return (
    <BillsShell member={member} current={tab} counts={counts}>
      {bill.status === "reading" ? <Refresher /> : null}
      <Header bill={bill} row={row} tab={tab} />
      <BillReader
        pdfUrl={`/bills/${bill.id}/pdf`}
        fields={bill.fields}
        summary={bill.fields.length ? fieldSummary(bill.fields) : null}
        before={
          <>
            <Problems bill={bill} />
            <Decide bill={bill} member={member} row={row} />
          </>
        }
      >
        {bill.extracted && order ? <MatchTable invoice={bill.extracted} order={order} /> : null}
        <Activity events={events} />
      </BillReader>
    </BillsShell>
  );
}
