import { connect } from "@bootcamp/db";
import { asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema";
import { bookings, calls, lines, messages, team } from "./schema";

export const db = connect(schema);

export type Call = typeof calls.$inferSelect;
export type Line = typeof lines.$inferSelect;
export type Message = typeof messages.$inferSelect;

export async function addLine(callId: string, role: Line["role"], text: string) {
  await db.insert(lines).values({ callId, role, text });
}

export async function linesOf(callId: string): Promise<Line[]> {
  return db.select().from(lines).where(eq(lines.callId, callId)).orderBy(asc(lines.at));
}

export async function findCall(id: string): Promise<Call | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [found] = await db.select().from(calls).where(eq(calls.id, id));
  return found ?? null;
}

export async function recentCalls(limit = 50): Promise<Call[]> {
  return db.select().from(calls).orderBy(desc(calls.startedAt)).limit(limit);
}

export async function bookingsOfCall(callId: string) {
  return db.select().from(bookings).where(eq(bookings.callId, callId)).orderBy(asc(bookings.start));
}

export async function takeMessage(message: typeof messages.$inferInsert) {
  await db.insert(messages).values(message);
}

export async function openMessages(): Promise<Message[]> {
  return db.select().from(messages).where(eq(messages.done, false)).orderBy(desc(messages.createdAt));
}

export async function messagesOfCall(callId: string): Promise<Message[]> {
  return db.select().from(messages).where(eq(messages.callId, callId));
}

export async function markMessageDone(id: string) {
  await db.update(messages).set({ done: true }).where(eq(messages.id, id));
}

export async function isOnTeam(userId: string): Promise<boolean> {
  const [found] = await db.select().from(team).where(eq(team.userId, userId));
  return Boolean(found);
}

export async function addToTeam(userId: string) {
  await db.insert(team).values({ userId }).onConflictDoNothing();
}
