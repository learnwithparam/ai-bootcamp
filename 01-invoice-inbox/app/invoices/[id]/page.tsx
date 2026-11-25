import { Topbar } from "@bootcamp/auth/topbar";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionForm } from "../../../components/DecisionForm";
import { InvoiceCheck } from "../../../components/InvoiceCheck";
import { findInvoice, findOrder } from "../../../db/queries";
import { decideInvoice } from "../../actions";
import { requireUser } from "../../session";

// One invoice: the PDF on the left, what the model read and how it checked out on the right.
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await findInvoice(id);
  if (!invoice) notFound();
  const order = await findOrder(Number(invoice.extracted.invoiceNumber));
  return (
    <div className="app">
      <Topbar title="Invoice inbox" userName={user.name} />
      <main className="review">
        {/* The hash asks the browser's PDF viewer to fit the page width and hide its thumbnail rail. */}
        <iframe
          className="review-pdf"
          src={`/invoices/${id}/pdf#view=FitH&navpanes=0`}
          title={invoice.fileName}
        />
        <section className="review-side">
          <Link href="/" className="back">
            Back to the inbox
          </Link>
          <InvoiceCheck invoice={invoice} order={order} />
          {invoice.status === "exception" ? <DecisionForm id={id} action={decideInvoice} /> : null}
        </section>
      </main>
    </div>
  );
}
