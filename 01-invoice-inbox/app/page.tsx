import { InvoiceList } from "../components/InvoiceList";
import { Topbar } from "../components/Topbar";
import { UploadBox } from "../components/UploadBox";
import { listInvoices } from "../db/queries";
import { uploadInvoices } from "./actions";
import { requireUser } from "./session";

// The inbox. Invoices that need a person come first, oldest at the top, because they wait longest.
export default async function InboxPage() {
  const user = await requireUser();
  const all = await listInvoices();
  const waiting = all.filter((invoice) => invoice.status === "exception").reverse();
  const matched = all.filter((invoice) => invoice.status === "matched");
  const decided = all.filter((invoice) => invoice.status === "approved" || invoice.status === "rejected");
  return (
    <div className="app">
      <Topbar userName={user.name} />
      <main className="inbox">
        <UploadBox action={uploadInvoices} />
        <InvoiceList
          title="Needs a person"
          hint="The invoice does not match its purchase order. Open it to approve or reject."
          invoices={waiting}
          empty="Nothing is waiting. Every invoice so far matched its order."
        />
        <InvoiceList
          title="Matched, ready to pay"
          hint="Every line, price and total agrees with the purchase order."
          invoices={matched}
          empty="No matched invoices yet."
        />
        <InvoiceList title="Decided" invoices={decided} empty="No decisions yet." />
      </main>
    </div>
  );
}
