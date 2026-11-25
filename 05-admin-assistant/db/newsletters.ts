import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./queries";
import { type Newsletter, newsletters } from "./schema";

export async function newsletterList(): Promise<Newsletter[]> {
  return db.select().from(newsletters).orderBy(desc(newsletters.updatedAt));
}

export async function newsletterById(id: number): Promise<Newsletter | null> {
  const [row] = await db.select().from(newsletters).where(eq(newsletters.id, id));
  return row ?? null;
}

export async function createNewsletter(
  subject: string,
  body: string,
  writtenBy: string,
): Promise<Newsletter> {
  const [row] = await db.insert(newsletters).values({ subject, body, writtenBy }).returning();
  if (!row) throw new Error("The newsletter was not saved.");
  return row;
}

// The assistant's edit. The text it replaced is kept, so the editor can show the change and undo it.
// An approved newsletter is never changed: the update matches drafts only.
export async function reviseNewsletter(
  id: number,
  subject: string,
  body: string,
): Promise<Newsletter | null> {
  const [row] = await db
    .update(newsletters)
    .set({
      previousSubject: newsletters.subject,
      previousBody: newsletters.body,
      subject,
      body,
      updatedAt: sql`now()`,
    })
    .where(and(eq(newsletters.id, id), eq(newsletters.status, "draft")))
    .returning();
  return row ?? null;
}

// A person's own edit, typed in the editor. It clears any pending assistant change, since the person has read it.
export async function saveNewsletter(id: number, subject: string, body: string) {
  await db
    .update(newsletters)
    .set({ subject, body, previousSubject: null, previousBody: null, updatedAt: sql`now()` })
    .where(and(eq(newsletters.id, id), eq(newsletters.status, "draft")));
}

// Keep: the assistant's change stays and the diff goes. Undo: the text before the change comes back.
export async function settleRevision(id: number, keep: boolean) {
  const back = keep
    ? {}
    : { subject: sql`coalesce(previous_subject, subject)`, body: sql`coalesce(previous_body, body)` };
  await db
    .update(newsletters)
    .set({ ...back, previousSubject: null, previousBody: null, updatedAt: sql`now()` })
    .where(and(eq(newsletters.id, id), eq(newsletters.status, "draft")));
}

export async function approveNewsletter(id: number, ownerId: string): Promise<boolean> {
  const rows = await db
    .update(newsletters)
    .set({
      status: "approved",
      approvedBy: ownerId,
      previousSubject: null,
      previousBody: null,
      updatedAt: sql`now()`,
    })
    .where(and(eq(newsletters.id, id), eq(newsletters.status, "draft")))
    .returning({ id: newsletters.id });
  return rows.length > 0;
}

export async function newsletterFacts() {
  const found = await db.execute<{ waiting: number; days: number | null }>(sql`
    select count(*) filter (where status = 'draft')::int as waiting,
      (extract(day from now() - max(created_at)))::int as days
    from admin_assistant.newsletters`);
  return { waiting: found.rows[0]?.waiting ?? 0, daysSince: found.rows[0]?.days ?? null };
}
