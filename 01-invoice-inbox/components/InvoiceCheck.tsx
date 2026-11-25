import { formatCents, type Invoice, type InvoiceLine, sameName, toCents } from "../rules/invoice";
import { agreedPriceCents, type InvoiceRecord, type OrderLine, type PurchaseOrder } from "../rules/match";
import { StatusChip } from "./StatusChip";

// What the model read, set line by line against the purchase order.
// A figure that disagrees with the order is highlighted, the way a clerk marks it with a pen.

type Row = { product: string; billed?: InvoiceLine; ordered?: OrderLine };

function pairLines(lines: InvoiceLine[], order: PurchaseOrder | undefined): Row[] {
  const orderLines = order?.lines ?? [];
  const rows: Row[] = lines.map((billed) => ({
    product: billed.product,
    billed,
    ordered: orderLines.find((line) => sameName(line.product, billed.product)),
  }));
  for (const ordered of orderLines) {
    if (!lines.some((billed) => sameName(billed.product, ordered.product)))
      rows.push({ product: ordered.product, ordered });
  }
  return rows;
}

function Figure({ value, wrong, note }: { value: string; wrong: boolean; note?: string }) {
  if (!wrong) return <td className="num">{value}</td>;
  return (
    <td className="num">
      <mark>{value}</mark>
      {note ? <span className="num-note">{note}</span> : null}
    </td>
  );
}

function LineRow({ row }: { row: Row }) {
  const { billed, ordered } = row;
  if (!billed) {
    return (
      <tr className="line-missing">
        <td>{row.product}</td>
        <td colSpan={3}>
          <mark>Ordered {ordered?.quantity}, not billed</mark>
        </td>
      </tr>
    );
  }
  const billedEach = toCents(billed.unitPrice);
  const agreed = ordered ? agreedPriceCents(ordered) : undefined;
  const discount = ordered?.discountPercent ? `${ordered.discountPercent}% off` : "";
  return (
    <tr>
      <td>{ordered ? row.product : <mark>{row.product}</mark>}</td>
      <Figure
        value={String(billed.quantity)}
        wrong={!!ordered && ordered.quantity !== billed.quantity}
        note={`ordered ${ordered?.quantity}`}
      />
      <Figure
        value={formatCents(billedEach)}
        wrong={agreed !== undefined && agreed !== billedEach}
        note={`agreed ${formatCents(agreed ?? 0)} ${discount}`}
      />
      <td className="num">{formatCents(toCents(billed.lineTotal))}</td>
    </tr>
  );
}

export function InvoiceCheck({
  invoice,
  order,
}: {
  invoice: InvoiceRecord;
  order: PurchaseOrder | undefined;
}) {
  return (
    <article className="check">
      <header className="check-head">
        <h1>Invoice {invoice.extracted.invoiceNumber}</h1>
        <StatusChip status={invoice.status} />
      </header>
      <Facts invoice={invoice} order={order} />
      <Ledger invoice={invoice.extracted} order={order} />
      <Findings invoice={invoice} />
    </article>
  );
}

function Facts({ invoice, order }: { invoice: InvoiceRecord; order: PurchaseOrder | undefined }) {
  return (
    <dl className="facts">
      <dt>From</dt>
      <dd>{invoice.extracted.customer}</dd>
      <dt>Dated</dt>
      <dd>{invoice.extracted.invoiceDate}</dd>
      <dt>Order</dt>
      <dd>{order ? `#${order.orderNumber}, placed ${order.orderedOn}` : <mark>No matching order</mark>}</dd>
      <dt>Uploaded by</dt>
      <dd>{invoice.uploadedBy}</dd>
    </dl>
  );
}

function Ledger({ invoice: read, order }: { invoice: Invoice; order: PurchaseOrder | undefined }) {
  return (
    <table className="ledger">
      <thead>
        <tr>
          <th>Product</th>
          <th className="num">Qty</th>
          <th className="num">Each</th>
          <th className="num">Line total</th>
        </tr>
      </thead>
      <tbody>
        {pairLines(read.lines, order).map((row) => (
          <LineRow key={row.product} row={row} />
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}>Total</td>
          <td className="num">{formatCents(toCents(read.total))}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function Findings({ invoice }: { invoice: InvoiceRecord }) {
  if (invoice.decidedBy) {
    const verb = invoice.status === "approved" ? "Approved" : "Rejected";
    return (
      <p className="decision">
        {verb} by {invoice.decidedBy} on {invoice.decidedAt?.toISOString().slice(0, 10)}: {invoice.note}
      </p>
    );
  }
  if (invoice.problems.length === 0)
    return <p className="findings-clear">Every line agrees with the order.</p>;
  return (
    <ul className="findings">
      {invoice.problems.map((problem) => (
        <li key={problem.message}>{problem.message}</li>
      ))}
    </ul>
  );
}
