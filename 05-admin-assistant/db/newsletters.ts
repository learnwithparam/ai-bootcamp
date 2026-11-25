import { createHash } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { foreignLinks } from "../rules/email";
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

// The version an owner read: a hash of the subject and body on their screen.
export function versionOf(letter: { subject: string; body: string }): string {
  return createHash("sha256").update(letter.subject).update("\n").update(letter.body).digest("hex");
}

// Why an approval was refused. The page shows one of these by its key, so a crafted address cannot put words on it.
export const APPROVE_PROBLEMS = {
  gone: "This newsletter is not a draft any more.",
  pending: "Keep or undo the assistant's change before approving.",
  changed: "The draft changed after you opened it. Read it again, then approve.",
  links: "The draft links outside learnwithparam.com. Remove those links first.",
} as const;
export type ApproveProblem = keyof typeof APPROVE_PROBLEMS;

// Approves only the exact text the owner read, with no assistant change still waiting and no outside link.
// Returns why it refused, or null once approved.
export async function approveNewsletter(
  id: number,
  ownerId: string,
  version: string,
): Promise<ApproveProblem | null> {
  const letter = await newsletterById(id);
  if (letter?.status !== "draft") return "gone";
  if (letter.previousBody !== null) return "pending";
  if (versionOf(letter) !== version) return "changed";
  if (foreignLinks(letter.body).length) return "links";
  const rows = await db
    .update(newsletters)
    .set({ status: "approved", approvedBy: ownerId, updatedAt: sql`now()` })
    .where(
      and(
        eq(newsletters.id, id),
        eq(newsletters.status, "draft"),
        eq(newsletters.subject, letter.subject),
        eq(newsletters.body, letter.body),
        isNull(newsletters.previousBody),
      ),
    )
    .returning({ id: newsletters.id });
  return rows.length ? null : "changed";
}

export async function newsletterFacts() {
  const found = await db.execute<{ waiting: number; days: number | null }>(sql`
    select count(*) filter (where status = 'draft')::int as waiting,
      (extract(day from now() - max(created_at)))::int as days
    from admin_assistant.newsletters`);
  return { waiting: found.rows[0]?.waiting ?? 0, daysSince: found.rows[0]?.days ?? null };
}
