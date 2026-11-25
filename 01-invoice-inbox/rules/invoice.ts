import { z } from "zod";

// What the model must read from an invoice PDF. The agent asks for exactly this shape,
// and the model's reply is rejected if it does not fit.

export const invoiceLine = z.object({
  product: z.string().describe("The product name, exactly as printed."),
  unitPrice: z.number().describe("The price of one unit in dollars, for example 7.7."),
  quantity: z.number().int().describe("How many units were billed."),
  lineTotal: z.number().describe("The total printed on this line in dollars."),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().describe("The invoice number. On these invoices it is the order number."),
  customer: z.string().describe("The customer the invoice is billed to."),
  invoiceDate: z.string().describe("The invoice date as YYYY-MM-DD."),
  lines: z.array(invoiceLine).describe("Every product line, top to bottom."),
  total: z.number().describe("The total amount due in dollars."),
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceLine = z.infer<typeof invoiceLine>;

// Money is compared in whole cents, so 0.1 + 0.2 never shows up as a mismatch.
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return dollars.format(cents / 100);
}

// "Jack's New England Clam Chowder" and "jacks new england clam chowder" are the same product.
export function sameName(left: string, right: string): boolean {
  const plain = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return plain(left) === plain(right);
}
