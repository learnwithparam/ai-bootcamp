import { type Invoice, sameName, toCents } from "./invoice";

// The model says what a bill says. This checks it against the PDF's own text layer, which the model never sees:
// each value it read must be printed on the page, and the spot is kept so the screen can highlight it.
// A value that is not on the page is not trusted, however sure the model sounded.

// One piece of text on the page, in points from the top-left corner.
export type Word = { text: string; x: number; y: number; width: number; height: number };
export type PageText = { width: number; height: number; words: Word[] };
export type Box = Pick<Word, "x" | "y" | "width" | "height">;

export type FieldCheck = { key: string; label: string; value: string; box: Box | null };

const plain = (text: string) => text.replace(/\s+/g, " ").trim();

// "$1484.00" and "$1,484.00" are the same amount.
export function moneyCents(text: string): number | null {
  const match = /^\$?\s*(-?[\d,]+(?:\.\d{1,2})?)$/.exec(plain(text));
  return match?.[1] ? toCents(Number(match[1].replaceAll(",", ""))) : null;
}

type Matches = (text: string) => boolean;

const isText =
  (value: string): Matches =>
  (text) =>
    sameName(text, value) && plain(text) !== "";
const isMoney =
  (dollars: number): Matches =>
  (text) =>
    moneyCents(text) === toCents(dollars);
const isWhole =
  (count: number): Matches =>
  (text) =>
    plain(text) === String(count);

function find(words: Word[], matches: Matches): Box | null {
  const word = words.find((each) => matches(each.text));
  return word ? { x: word.x, y: word.y, width: word.width, height: word.height } : null;
}

// The words printed on the same row as a box, so a line's price is looked for on that line only.
function sameRow(words: Word[], row: Box | null): Word[] {
  if (!row) return [];
  return words.filter((word) => Math.abs(word.y - row.y) < row.height / 2);
}

const dollars = (amount: number) => `$${amount.toFixed(2)}`;

function headerChecks(invoice: Invoice, words: Word[]): FieldCheck[] {
  return [
    {
      key: "number",
      label: "Bill number",
      value: invoice.invoiceNumber,
      box: find(words, isText(invoice.invoiceNumber)),
    },
    {
      key: "customer",
      label: "Billed to",
      value: invoice.customer,
      box: find(words, isText(invoice.customer)),
    },
    {
      key: "date",
      label: "Bill date",
      value: invoice.invoiceDate,
      box: find(words, isText(invoice.invoiceDate)),
    },
  ];
}

function lineChecks(invoice: Invoice, words: Word[]): FieldCheck[] {
  return invoice.lines.flatMap((line, index) => {
    const product = find(words, isText(line.product));
    const row = sameRow(words, product);
    const key = (part: string) => `line-${index}-${part}`;
    return [
      { key: key("product"), label: "Product", value: line.product, box: product },
      {
        key: key("price"),
        label: "Unit price",
        value: dollars(line.unitPrice),
        box: find(row, isMoney(line.unitPrice)),
      },
      {
        key: key("quantity"),
        label: "Quantity",
        value: String(line.quantity),
        box: find(row, isWhole(line.quantity)),
      },
      {
        key: key("total"),
        label: "Line total",
        value: dollars(line.lineTotal),
        box: find(row, isMoney(line.lineTotal)),
      },
    ];
  });
}

// Every field the model read, with where it is printed, or null when the page does not show it.
export function checkFields(invoice: Invoice, page: PageText): FieldCheck[] {
  const total = { key: "total", label: "Total", value: dollars(invoice.total), box: null as Box | null };
  const totalRow = sameRow(
    page.words,
    find(page.words, (text) => /^total:?$/i.test(plain(text))),
  );
  total.box = find(totalRow, isMoney(invoice.total)) ?? find(page.words, isMoney(invoice.total));
  return [...headerChecks(invoice, page.words), ...lineChecks(invoice, page.words), total];
}

// How many of the fields were found on the page. None found usually means a scan with no text layer.
export function fieldSummary(checks: FieldCheck[]): string {
  const missing = checks.filter((check) => !check.box).length;
  if (missing === 0) return `All ${checks.length} fields were found on the page.`;
  if (missing === checks.length)
    return "None of the fields were found on the page. It may be a scan: check every field by eye.";
  return `${missing} of ${checks.length} fields were not found on the page. Check them by eye.`;
}
