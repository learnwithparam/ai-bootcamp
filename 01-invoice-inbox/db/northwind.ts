import { createHash } from "node:crypto";
import type { PurchaseOrder } from "../rules/match";

// The order system: Microsoft's Northwind sample database (MIT license), pinned to one commit
// and checked against a hash, so every learner loads the same 830 orders.
const SCRIPT_URL =
  "https://raw.githubusercontent.com/microsoft/sql-server-samples/2f85f3724ee45776a5183ed34d064488a6e1dc53/samples/databases/northwind-pubs/instnwnd.sql";
const SCRIPT_SHA256 = "3cc62b3fca6d244a47dbde698b809331e4f85988a0685b2b370717d431e94871";

// The invoices: generated from the same orders by the northwind_invocies dataset (Apache 2.0).
const INVOICE_URL =
  "https://huggingface.co/datasets/AyoubChLin/northwind_invocies/resolve/12ccecce99bacde949661780b59805e5a36578e1";

export async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function downloadInvoice(orderNumber: number): Promise<Buffer> {
  return download(`${INVOICE_URL}/invoice_${orderNumber}.pdf`);
}

const unquote = (text: string) => text.replace(/''/g, "'");

// '7/8/1996' becomes '1996-07-08'.
function isoDate(usDate: string): string {
  const [month, day, year] = usDate.split("/");
  return `${year}-${month?.padStart(2, "0")}-${day?.padStart(2, "0")}`;
}

function parseNames(script: string, table: string, idPattern: string): Map<string, string> {
  const row = new RegExp(`INSERT "${table}"[^\\n]*?VALUES\\(${idPattern},N?'((?:[^']|'')*)'`, "g");
  return new Map([...script.matchAll(row)].map(([, id, name]) => [String(id), unquote(name ?? "")]));
}

// Reads orders and their lines out of the SQL Server script, without running it.
export function parseOrders(script: string): PurchaseOrder[] {
  const customers = parseNames(script, "Customers", "'(\\w+)'");
  const products = parseNames(script, "Products", "(\\d+)");
  const orders = new Map<number, PurchaseOrder>();
  for (const [, number, customerId, date] of script.matchAll(/VALUES \((\d+),N'(\w+)',\d+,'([\d/]+)'/g)) {
    const customer = customers.get(customerId ?? "");
    if (!customer) throw new Error(`Order ${number} names an unknown customer ${customerId}.`);
    orders.set(Number(number), {
      orderNumber: Number(number),
      customer,
      orderedOn: isoDate(date ?? ""),
      lines: [],
    });
  }
  const detail = /INSERT "Order Details" VALUES\((\d+),(\d+),([\d.]+),(\d+),([\d.]+)\)/g;
  for (const [, number, productId, price, quantity, discount] of script.matchAll(detail)) {
    const order = orders.get(Number(number));
    const product = products.get(productId ?? "");
    if (!order || !product) throw new Error(`Order line ${number}/${productId} has no order or product.`);
    order.lines.push({
      product,
      unitPriceCents: Math.round(Number(price) * 100),
      quantity: Number(quantity),
      discountPercent: Math.round(Number(discount) * 100),
    });
  }
  return [...orders.values()];
}

export async function loadOrders(): Promise<PurchaseOrder[]> {
  const script = await download(SCRIPT_URL);
  const hash = createHash("sha256").update(script).digest("hex");
  if (hash !== SCRIPT_SHA256)
    throw new Error(`The Northwind script changed (sha256 ${hash}). Check ${SCRIPT_URL}.`);
  return parseOrders(script.toString("utf8"));
}
