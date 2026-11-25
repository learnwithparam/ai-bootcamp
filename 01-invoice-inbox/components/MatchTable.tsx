import { CircleCheck, CircleX } from "lucide-react";
import { formatCents, type Invoice, sameName, toCents } from "../rules/invoice";
import { agreedPriceCents, type PurchaseOrder } from "../rules/match";

type Line = { product: string; billed: string; ordered: string; ok: boolean };

function linesOf(invoice: Invoice, order: PurchaseOrder): Line[] {
  const billed = invoice.lines.map((line) => {
    const match = order.lines.find((each) => sameName(each.product, line.product));
    const agreed = match ? agreedPriceCents(match) : null;
    return {
      product: line.product,
      billed: `${line.quantity} x ${formatCents(toCents(line.unitPrice))}`,
      ordered: match && agreed !== null ? `${match.quantity} x ${formatCents(agreed)}` : "Not ordered",
      ok: Boolean(match && agreed === toCents(line.unitPrice) && match.quantity === line.quantity),
    };
  });
  const missing = order.lines
    .filter((line) => !invoice.lines.some((each) => sameName(each.product, line.product)))
    .map((line) => ({
      product: line.product,
      billed: "Not billed",
      ordered: `${line.quantity} x ${formatCents(agreedPriceCents(line))}`,
      ok: false,
    }));
  return [...billed, ...missing];
}

// The bill beside its purchase order, line by line, at the price agreed after any discount.
export function MatchTable({ invoice, order }: { invoice: Invoice; order: PurchaseOrder }) {
  return (
    <section className="panel match-panel" aria-label="Against the purchase order">
      <div className="panel-head">
        <h2>Against the purchase order</h2>
      </div>
      <div className="table-wrap match-wrap">
        <table className="table match-table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Billed</th>
              <th className="num">Order {order.orderNumber}</th>
              <th>
                <span className="sr-only">Matches</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linesOf(invoice, order).map((line) => (
              <tr key={line.product}>
                <td>{line.product}</td>
                <td className="num">{line.billed}</td>
                <td className="num">{line.ordered}</td>
                <td className={line.ok ? "match-ok" : "match-off"}>
                  {line.ok ? <CircleCheck aria-label="Matches" /> : <CircleX aria-label="Does not match" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
