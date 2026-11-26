import { Search } from "lucide-react";
import Link from "next/link";
import { type Account, CUSTOMERS_PER_PAGE, customerPage } from "../../../db/queries";
import { requireTeam } from "../../session";

const when = (date: Date) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

function SearchBox({ q }: { q: string }) {
  return (
    <search className="page-actions">
      <form className="search">
        <Search aria-hidden="true" />
        <input
          className="field"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          aria-label="Search customers"
        />
      </form>
    </search>
  );
}

function CustomerTable({ accounts }: { accounts: Account[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Signed up</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <td className="customer-name">{account.name}</td>
              <td>{account.email}</td>
              <td>{when(account.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {accounts.length === 0 ? (
        <p className="empty-state">No account matches. Try part of a name or an email.</p>
      ) : null}
    </div>
  );
}

function Pager({ current, pages, link }: { current: number; pages: number; link: (to: number) => string }) {
  return (
    <nav className="pager" aria-label="Pages">
      {current > 1 ? <Link href={link(current - 1)}>Previous</Link> : <span />}
      <span>
        Page {current} of {pages}
      </span>
      {current < pages ? <Link href={link(current + 1)}>Next</Link> : <span />}
    </nav>
  );
}

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

// Every account, newest first. A name is whatever the person typed at sign-up, so it is shown as text and nothing more.
export default async function Customers({ searchParams }: Props) {
  await requireTeam();
  const { q = "", page = "1" } = await searchParams;
  const current = Math.max(1, Number.parseInt(page, 10) || 1);
  const { accounts, total } = await customerPage(q, current);
  const pages = Math.max(1, Math.ceil(total / CUSTOMERS_PER_PAGE));
  const link = (to: number) => `/customers?${new URLSearchParams({ q, page: String(to) })}`;
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Customers</h1>
          <p>
            {total} accounts{q ? ` match "${q}"` : ""}.
          </p>
        </div>
        <SearchBox q={q} />
      </header>
      <CustomerTable accounts={accounts} />
      <Pager current={current} pages={pages} link={link} />
    </>
  );
}
