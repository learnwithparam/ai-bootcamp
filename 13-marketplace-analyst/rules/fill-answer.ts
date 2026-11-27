import { type Cell, type Query, succeeded } from "./result";

// The model writes an answer with slots, never values. {{q1.1.orders}} is the column "orders" of row 1 of
// query q1. {{q1.list}} is the rows of q1 as a list. Code fills them from the rows the model never saw.

const SLOT = /\{\{([^{}]*)\}\}/g;
const ONE_VALUE = /^(q\d+)\.(\d+)\.(.+)$/;
const WHOLE_LIST = /^(q\d+)\.list$/;
const LIST_ROWS = 10;
// Columns that hold money, by name, and a currency sign standing before a slot.
const MONEY = /price|value|freight|sales|revenue|amount|spen[dt]|paid|cost/i;
const CURRENCY = /R\$\s*(\{\{\s*q\d+\.(?:\d+\.([^{}]*?)|list)\s*\}\})/g;
// Whole numbers that name something are written without thousands separators.
const PLAIN = /(^|_)(year|month|day|id|zip|code|prefix)($|_)/i;

export function shown(cell: Cell, column: string): string {
  if (cell === null) return "none";
  if (typeof cell !== "number") return String(cell);
  if (PLAIN.test(column)) return String(cell);
  return cell.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function listOf(query: Query): string {
  const lines = query.rows.slice(0, LIST_ROWS).map((row) => {
    const cells = row.map((cell, i) => shown(cell, query.columns[i]?.name ?? ""));
    return `- ${cells.join(": ")}`;
  });
  const more = query.rows.length - lines.length;
  return `\n\n${[...lines, ...(more > 0 ? [`- and ${more} more rows below`] : [])].join("\n")}\n\n`;
}

function slotValue(slot: string, queries: Query[]): string | undefined {
  const list = WHOLE_LIST.exec(slot);
  if (list) {
    const query = queries.find((each) => each.id === list[1] && !each.error);
    return query?.rows.length ? listOf(query) : undefined;
  }
  const [, id, row, column] = ONE_VALUE.exec(slot) ?? [];
  const query = queries.find((each) => each.id === id && !each.error);
  const at = query?.columns.findIndex((each) => each.name === column) ?? -1;
  const cells = query?.rows[Number(row) - 1];
  return at >= 0 && cells ? shown(cells[at] ?? null, column ?? "") : undefined;
}

// What the writer's template is allowed to be, for the screen, the saved chat and the judge alike.
export function tidy(template: string): string {
  // The model sometimes writes R$ before a count. A list or a column that is not money loses it.
  const priced = template.replace(CURRENCY, (all, slot: string, column?: string) =>
    column && MONEY.test(column) ? all : slot,
  );
  // Words after the last list, with no slot in them, cannot say anything about rows the model never saw.
  return priced.replace(/(\.list\s*\}\})[^{}]*$/, "$1");
}

export function fillAnswer(template: string, queries: Query[]): { answer: string; removed: string[] } {
  const removed: string[] = [];
  const filled = tidy(template).replace(SLOT, (_, slot: string) => {
    const value = slotValue(slot.trim(), queries);
    if (value === undefined) removed.push(slot.trim());
    return value ?? "(not in the result)";
  });
  return { answer: filled.replace(/\n{3,}/g, "\n\n").trim(), removed };
}

const NUMBERS = /\d+(?:[.,]\d+)*/g;

// Numbers the model typed itself. A number is allowed outside a slot only when the model could know it
// without the rows: it is in the question, in the SQL, or is a row count.
export function ungroundedNumbers(template: string, question: string, queries: Query[]): string[] {
  const known = new Set([question, ...queries.map((q) => q.sql)].join(" ").match(NUMBERS) ?? []);
  for (const query of queries) known.add(String(query.rows.length));
  const typed =
    template
      .replace(SLOT, " ")
      .replace(/\bq\d+\b/g, " ")
      .match(NUMBERS) ?? [];
  return typed.filter((number) => !known.has(number));
}

// The slots an answer cannot do without: the list of a result with several rows, and every value of a
// result with one row. A model that skips them is writing from imagination.
export function requiredSlots(queries: Query[]): string[] {
  return succeeded(queries).flatMap((query) => {
    if (query.rows.length === 0) return [];
    if (query.rows.length > 1) return [`{{${query.id}.list}}`];
    return query.columns.map((column) => `{{${query.id}.1.${column.name}}}`);
  });
}

// Which results does the answer say nothing about? A one-row result needs one of its values.
export function missingSlots(template: string, queries: Query[]): string[] {
  return succeeded(queries)
    .filter((query) => query.rows.length > 0)
    .filter((query) => {
      const slot = query.rows.length > 1 ? `{{${query.id}.list}}` : `{{${query.id}.1.`;
      return !template.includes(slot);
    })
    .map((query) => query.id);
}

// Is there anything to read besides the values? A bare list does not say what it lists.
export function hasWords(template: string): boolean {
  return /\p{L}{2}/u.test(template.replace(SLOT, " "));
}

// Does the sentence start with a list, or carry on after one? Filled in, it would be cut in two.
export function splitByList(template: string): boolean {
  return /^\s*\{\{\s*q\d+\.list|\.list\s*\}\}[\s,;]*\p{Ll}/u.test(template);
}

// Column names such as order_count are the database's words, not the reader's.
export function namesColumn(template: string, queries: Query[]): boolean {
  const words = template.replace(SLOT, " ");
  return queries.some((q) => q.columns.some((c) => c.name.includes("_") && words.includes(c.name)));
}

// A question asked back, a brace left outside a slot, or a hole before a full stop.
export function brokenProse(template: string): boolean {
  return /\?|[{}]|\s[.,;:](\s|$)/.test(template.replace(SLOT, "x"));
}

// The template as a judge reads it: each slot named in words, such as "(canceled orders)". No value.
export function standIns(template: string, queries: Query[]): string {
  const words = (name: string) => name.replace(/_/g, " ");
  return template.replace(SLOT, (_, slot: string) => {
    const list = WHOLE_LIST.exec(slot.trim());
    if (!list) return `(${words(ONE_VALUE.exec(slot.trim())?.[3] ?? "value")})`;
    const columns = queries.find((each) => each.id === list[1])?.columns ?? [];
    return `(a list of ${columns.map((column) => words(column.name)).join(" and ")})`;
  });
}

// Written by code when the model's answer would not do: the rows, and nothing claimed about them.
export function plainTemplate(queries: Query[]): string {
  const rows = requiredSlots(queries)
    .map((slot) => (slot.endsWith(".list}}") ? slot : `${slot.slice(2, -2).split(".")[2]}: ${slot}`))
    .join("\n\n");
  return rows ? `Here is what the query returned.\n\n${rows}` : rows;
}
