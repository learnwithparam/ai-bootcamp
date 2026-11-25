import { and, asc, count, desc, eq, ilike, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { type BillRecord, type BillStatus, TABS, type Tab } from "../rules/bill";
import { db } from "./queries";
import { billEvents, bills } from "./schema";

const summary = {
  id: bills.id,
  fileName: bills.fileName,
  uploadedBy: bills.uploadedBy,
  receivedAt: bills.receivedAt,
  status: bills.status,
  extracted: bills.extracted,
  fields: bills.fields,
  problems: bills.problems,
  fix: bills.fix,
  payCents: bills.payCents,
  duplicateOf: bills.duplicateOf,
};

type NewBill = { fileName: string; pdf: Buffer; uploadedBy: string; receivedAt?: Date };

// A bill lands as "reading". The assistant picks it up straight after, in the background.
export async function addBill(bill: NewBill): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(bills).values(bill).returning({ id: bills.id, at: bills.receivedAt });
    if (!row) throw new Error("Saving the bill returned no row.");
    await tx
      .insert(billEvents)
      .values({ billId: row.id, at: row.at, actor: bill.uploadedBy, text: `Uploaded ${bill.fileName}.` });
    return row.id;
  });
}

export async function billPdf(id: string): Promise<Buffer | undefined> {
  const [row] = await db.select({ pdf: bills.pdf }).from(bills).where(eq(bills.id, id));
  return row?.pdf;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Readings of one bill number are checked and saved one at a time. Two copies read at the same moment
// would each miss the other, and both would go on to be paid. With the lock, the second one sees the first.
export function oneNumberAtATime<T>(invoiceNumber: string, work: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`invoice-inbox:${invoiceNumber}`}))`);
    return work(tx);
  });
}

// Every other bill already read and not rejected, oldest first, for the duplicate check.
export async function otherCopies(id: string, on: Tx) {
  return on
    .select({ id: bills.id, number: sql<string>`${bills.extracted}->>'invoiceNumber'` })
    .from(bills)
    .where(and(ne(bills.id, id), isNotNull(bills.extracted), ne(bills.status, "rejected")))
    .orderBy(asc(bills.receivedAt));
}

export type Reading = Pick<
  BillRecord,
  "status" | "extracted" | "fields" | "problems" | "fix" | "payCents" | "duplicateOf"
>;

// The assistant's work, saved in one go with the lines it adds to the activity log.
// Each line is a millisecond after the one before, so the log reads in the order the work was done.
export async function saveReading(id: string, reading: Reading, notes: string[], on: Tx | typeof db = db) {
  await on.transaction(async (tx) => {
    const saved = await tx
      .update(bills)
      .set(reading)
      .where(and(eq(bills.id, id), eq(bills.status, "reading")))
      .returning({ id: bills.id });
    if (saved.length === 0 || notes.length === 0) return;
    const now = Date.now();
    await tx
      .insert(billEvents)
      .values(notes.map((text, index) => ({ billId: id, actor: null, text, at: new Date(now + index) })));
  });
}

const search = (query: string) => {
  const like = `%${query.replace(/[%_\\]/g, "\\$&")}%`;
  return or(
    ilike(sql`${bills.extracted}->>'invoiceNumber'`, like),
    ilike(sql`${bills.extracted}->>'customer'`, like),
    ilike(bills.fileName, like),
  );
};

// One tab of the worklist, oldest first, because the oldest bill is due first.
export async function listBills(tab: Tab, query = ""): Promise<BillRecord[]> {
  const inTab = inArray(bills.status, [...TABS[tab].statuses]);
  const where = query.trim() ? and(inTab, search(query.trim())) : inTab;
  return db.select(summary).from(bills).where(where).orderBy(asc(bills.receivedAt));
}

export async function statusCounts(): Promise<Partial<Record<BillStatus, number>>> {
  const rows = await db.select({ status: bills.status, n: count() }).from(bills).groupBy(bills.status);
  return Object.fromEntries(rows.map((row) => [row.status, row.n]));
}

export async function findBill(id: string): Promise<BillRecord | undefined> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const [row] = await db.select(summary).from(bills).where(eq(bills.id, id));
  return row;
}

export async function activityOf(id: string) {
  return db.select().from(billEvents).where(eq(billEvents.billId, id)).orderBy(desc(billEvents.at));
}

type Move = { from: BillStatus[]; to: BillStatus; actor: string; text: string; payCents?: number | null };

// A person moves bills on. Only bills still in a "from" status change, so a second click, or someone else
// deciding first, never overwrites a decision. Returns how many moved.
export async function moveBills(ids: string[], move: Move): Promise<number> {
  const valid = ids.filter((id) => /^[0-9a-f-]{36}$/.test(id));
  if (valid.length === 0) return 0;
  return db.transaction(async (tx) => {
    const set =
      move.payCents === undefined ? { status: move.to } : { status: move.to, payCents: move.payCents };
    const moved = await tx
      .update(bills)
      .set(set)
      .where(and(inArray(bills.id, valid), inArray(bills.status, move.from)))
      .returning({ id: bills.id });
    if (moved.length)
      await tx
        .insert(billEvents)
        .values(moved.map((row) => ({ billId: row.id, actor: move.actor, text: move.text })));
    return moved.length;
  });
}

// Tests and the seed remove what they made.
export async function removeBills(ids: string[]) {
  if (ids.length) await db.delete(bills).where(inArray(bills.id, ids));
}
