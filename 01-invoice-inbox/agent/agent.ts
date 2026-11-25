import { model } from "@bootcamp/model";
import { generateText, type LanguageModelUsage, Output } from "ai";
import { findOrder, saveInvoice } from "../db/queries";
import { type Invoice, invoiceSchema } from "../rules/invoice";
import { matchInvoiceToOrder, type Problem } from "../rules/match";
// The system prompt is plain text in instructions.md, next to this file.
import instructions from "./instructions.md" with { type: "text" };

// Start here. The model does one job: read the PDF into a fixed shape.
// Everything after that is plain code: find the purchase order, run the rules, save the result.

// Step 1: the model reads the invoice. Output.object rejects any reply that does not fit invoiceSchema.
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

// Step 2: check the reading against the purchase order in Postgres.
export async function checkInvoice(invoice: Invoice): Promise<Problem[]> {
  const order = await findOrder(Number(invoice.invoiceNumber));
  return matchInvoiceToOrder(invoice, order);
}

// The whole flow for one upload. An invoice with no problems is matched; anything else waits for a person.
export async function processInvoice(pdf: Buffer, fileName: string, uploadedBy: string): Promise<string> {
  const { invoice: extracted } = await readInvoice(pdf, fileName);
  const problems = await checkInvoice(extracted);
  return saveInvoice({ fileName, pdf, uploadedBy, extracted, problems });
}
