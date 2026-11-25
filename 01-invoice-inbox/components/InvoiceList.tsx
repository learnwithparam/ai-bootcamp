import Link from "next/link";
import { formatCents, toCents } from "../rules/invoice";
import type { InvoiceRecord } from "../rules/match";
import { StatusChip } from "./StatusChip";

type Props = { title: string; hint?: string; invoices: InvoiceRecord[]; empty: string };

// One queue in the inbox. Each row says who sent it, how much, and the first thing that is wrong.
export function InvoiceList({ title, hint, invoices, empty }: Props) {
  return (
    <section className="queue">
      <h2>
        {title} <span className="queue-count">{invoices.length}</span>
      </h2>
      {hint ? <p className="queue-hint">{hint}</p> : null}
      {invoices.length === 0 ? <p className="queue-empty">{empty}</p> : null}
      <ul className="rows">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <Link href={`/invoices/${invoice.id}`} className="row">
              <span className="row-number">#{invoice.extracted.invoiceNumber}</span>
              <span className="row-who">
                {invoice.extracted.customer}
                <span className="row-reason">{reason(invoice)}</span>
              </span>
              <span className="row-amount">{formatCents(toCents(invoice.extracted.total))}</span>
              {/* The queue heading already says what is waiting or matched. Only a decision needs its own label. */}
              {invoice.decidedBy ? <StatusChip status={invoice.status} /> : <span />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function reason(invoice: InvoiceRecord): string {
  if (invoice.status === "approved" || invoice.status === "rejected")
    return `${invoice.decidedBy}: ${invoice.note}`;
  const [first, ...rest] = invoice.problems;
  if (!first) return `${invoice.extracted.lines.length} lines, all agree with the order`;
  return rest.length ? `${first.message} (+${rest.length} more)` : first.message;
}
