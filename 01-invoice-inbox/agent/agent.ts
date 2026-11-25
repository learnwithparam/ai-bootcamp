import { model } from "@bootcamp/model";
import { generateText, type LanguageModelUsage, Output } from "ai";
import { billPdf, earlierNumbers, findBill, type Reading, saveReading } from "../db/bills";
import { findOrder } from "../db/queries";
import { duplicateProblem, suggestFix } from "../rules/bill";
import { formatCents, type Invoice, invoiceSchema, toCents } from "../rules/invoice";
import { checkFields, fieldSummary } from "../rules/locate";
import { matchInvoiceToOrder } from "../rules/match";
// The system prompt is plain text in instructions.md, next to this file.
import instructions from "./instructions.md" with { type: "text" };
import { readPageText } from "./page-text";

// Start here. Nobody chats with this assistant. It works in the background on every bill that arrives,
// and its work shows up on the bill: the fields it read, where each one is printed, and a suggested fix.
// The model does one job, reading the PDF into a fixed shape. Everything after that is plain code.

// Step 1: the model reads the bill. Output.object rejects any reply that does not fit invoiceSchema.
// usage holds the tokens, and on OpenRouter usage.raw.cost holds the price in dollars.
export async function readInvoice(
  pdf: Buffer,
  fileName: string,
): Promise<{ invoice: Invoice; usage: LanguageModelUsage }> {
  const { output, usage } = await generateText({
    model: model(),
    system: instructions,
    output: Output.object({ schema: invoiceSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Read this invoice." },
          { type: "file", data: pdf, mediaType: "application/pdf", filename: fileName },
        ],
      },
    ],
    experimental_telemetry: { isEnabled: true, functionId: "invoice-inbox.read-invoice" },
  });
  return { invoice: output, usage };
}

const STATUS_NOTE = {
  approval: "Everything matches the order and the delivery. Sent for approval.",
  review: "Sent to a clerk to review.",
} as const;

// Step 2 to 5 for one bill: check the reading against the page, the order and earlier bills, then suggest a fix.
export async function checkBill(id: string, pdf: Buffer, receivedAt: Date, invoice: Invoice) {
  const fields = checkFields(invoice, await readPageText(pdf));
  const order = await findOrder(Number(invoice.invoiceNumber));
  const problems = matchInvoiceToOrder(invoice, order);
  const duplicate = duplicateProblem(invoice.invoiceNumber, await earlierNumbers(id, receivedAt));
  if (duplicate) problems.unshift(duplicate.problem);
  const fix = suggestFix(invoice, order, problems);
  const status = problems.length === 0 ? "approval" : "review";
  const payCents = fix?.kind === "pay" ? fix.payCents : problems.length === 0 ? toCents(invoice.total) : null;
  const notes = [
    `Read bill ${invoice.invoiceNumber} for ${formatCents(toCents(invoice.total))}. ${fieldSummary(fields)}`,
    order
      ? `Matched it to purchase order ${order.orderNumber}.`
      : `Found no purchase order ${invoice.invoiceNumber}.`,
    ...problems.map((problem) => problem.message),
    ...(fix ? [`Suggested: ${fix.reason}`] : []),
    STATUS_NOTE[status],
  ];
  const reading = {
    status,
    extracted: invoice,
    fields,
    problems,
    fix,
    payCents,
    duplicateOf: duplicate?.duplicateOf ?? null,
  } as const;
  return { reading, notes };
}

// The whole job for one bill that has just arrived. A bill the model cannot read is marked unreadable,
// with the reason in the activity log and the server log, so a person reads the PDF instead.
export async function processBill(id: string): Promise<void> {
  const [bill, pdf] = await Promise.all([findBill(id), billPdf(id)]);
  if (!bill || !pdf || bill.status !== "reading") return;
  try {
    const { invoice } = await readInvoice(pdf, bill.fileName);
    const { reading, notes } = await checkBill(id, pdf, bill.receivedAt, invoice);
    await saveReading(id, reading, notes);
  } catch (error) {
    console.error(`Reading bill ${id} (${bill.fileName}) failed:`, error);
    const reading: Reading = {
      status: "unreadable",
      extracted: null,
      fields: [],
      problems: [],
      fix: null,
      payCents: null,
      duplicateOf: null,
    };
    await saveReading(id, reading, [
      "Could not read this PDF. Open it to check it is a bill, then read it again or reject it.",
    ]);
  }
}
