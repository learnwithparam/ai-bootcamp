import { Inbox, Search } from "lucide-react";
import Link from "next/link";
import { BillsShell, countIn } from "../../components/BillsShell";
import { BillTable } from "../../components/BillTable";
import { Refresher } from "../../components/Refresher";
import { rowOf } from "../../components/rows";
import { UploadBills } from "../../components/UploadBills";
import { listBills, statusCounts } from "../../db/bills";
import { isTab, TABS, type Tab } from "../../rules/bill";
import { requireMember } from "../session";

type Params = Promise<{ tab?: string; q?: string }>;

const EMPTY: Record<Tab, string> = {
  review: "Nothing needs review. Bills that do not match their order land here.",
  approval: "Nothing is waiting for approval.",
  payment: "Nothing is waiting to be paid.",
  paid: "No bills have been paid yet.",
  all: "No bills yet. Upload a supplier PDF to start.",
};

function SearchBills({ tab, query }: { tab: Tab; query: string }) {
  return (
    <search className="bills-search">
      <form action="/bills">
        <input type="hidden" name="tab" value={tab} />
        <Search aria-hidden="true" />
        <label htmlFor="q" className="sr-only">
          Search bills
        </label>
        <input
          id="q"
          name="q"
          type="search"
          className="field"
          placeholder="Search by bill number or location"
          defaultValue={query}
        />
      </form>
    </search>
  );
}

function Empty({ tab, query }: { tab: Tab; query: string }) {
  return (
    <div className="empty-state">
      <Inbox aria-hidden="true" />
      <strong>{query ? `No bills match "${query}".` : EMPTY[tab]}</strong>
      {query ? <Link href={`/bills?tab=${tab}`}>Clear the search</Link> : null}
    </div>
  );
}

export default async function BillsPage({ searchParams }: { searchParams: Params }) {
  const member = await requireMember();
  const given = await searchParams;
  const tab: Tab = isTab(given.tab) ? given.tab : member.role === "approver" ? "approval" : "review";
  const query = (given.q ?? "").slice(0, 80);
  const [bills, counts] = await Promise.all([listBills(tab, query), statusCounts()]);
  const today = new Date();
  const bulk =
    member.role !== "approver" ? null : tab === "approval" ? "approve" : tab === "payment" ? "pay" : null;
  return (
    <BillsShell member={member} current={tab} counts={counts}>
      {(counts.reading ?? 0) > 0 ? <Refresher /> : null}
      <header className="page-header">
        <div>
          <h1>{TABS[tab].label}</h1>
          <p>
            {countIn(tab, counts)} bills from Northwind Traders. Oldest first, so the next one due is on top.
          </p>
        </div>
        <div className="page-actions">
          <UploadBills />
        </div>
      </header>
      <SearchBills tab={tab} query={query} />
      {bills.length ? (
        <BillTable rows={bills.map((bill) => rowOf(bill, today))} bulk={bulk} />
      ) : (
        <Empty tab={tab} query={query} />
      )}
    </BillsShell>
  );
}
