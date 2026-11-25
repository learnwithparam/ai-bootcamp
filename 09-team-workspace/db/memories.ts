import { and, asc, count, eq, sql } from "drizzle-orm";
import { MEMORY, whyNotRemember } from "../rules/memory";
import { db } from "./queries";
import { memories } from "./schema";

export async function memoriesOf(userId: string) {
  return db
    .select({ id: memories.id, text: memories.text, chatId: memories.chatId, createdAt: memories.createdAt })
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(asc(memories.createdAt))
    .limit(MEMORY.perPerson);
}

// Checks the rules and saves in one transaction. The lock makes two saves at once count each other,
// so the limit of memories per person holds.
export async function remember(
  userId: string,
  text: string,
  chatId: string | null,
): Promise<{ id: string } | { refused: string }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`memories:${userId}`}))`);
    const [kept] = await tx.select({ total: count() }).from(memories).where(eq(memories.userId, userId));
    const refused = whyNotRemember(text, kept?.total ?? 0);
    if (refused) return { refused };
    const [saved] = await tx
      .insert(memories)
      .values({ userId, text: text.trim(), chatId })
      .returning({ id: memories.id });
    if (!saved) throw new Error("The memory was not saved.");
    return saved;
  });
}

// Forgets one memory of this person. Another person's memory id forgets nothing.
export async function forget(userId: string, memoryId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(memoryId)) return false;
  const gone = await db
    .delete(memories)
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)))
    .returning({ id: memories.id });
  return gone.length > 0;
}
