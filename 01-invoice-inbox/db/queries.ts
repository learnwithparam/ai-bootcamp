import { connect } from "@bootcamp/db";
import { asc, eq, inArray, sql } from "drizzle-orm";
import type { Role } from "../rules/bill";
import type { PurchaseOrder } from "../rules/match";
import * as schema from "./schema";

export const db = connect(schema);
const { members, orderLines, purchaseOrders } = schema;

// The purchase order with its lines, or undefined when there is no such order.
export async function findOrder(orderNumber: number): Promise<PurchaseOrder | undefined> {
  if (!Number.isSafeInteger(orderNumber)) return undefined;
  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.orderNumber, orderNumber));
  if (!order) return undefined;
  const lines = await db
    .select()
    .from(orderLines)
    .where(eq(orderLines.orderNumber, orderNumber))
    .orderBy(asc(orderLines.product));
  return { ...order, lines };
}

export async function saveOrders(orders: PurchaseOrder[]): Promise<void> {
  await db.transaction(async (tx) => {
    const numbers = orders.map((order) => order.orderNumber);
    await tx.delete(orderLines).where(inArray(orderLines.orderNumber, numbers));
    await tx
      .insert(purchaseOrders)
      .values(orders.map(({ lines, ...order }) => order))
      .onConflictDoUpdate({
        target: purchaseOrders.orderNumber,
        set: { shippedOn: sql`excluded.shipped_on` },
      });
    const lines = orders.flatMap((order) =>
      order.lines.map((line) => ({ ...line, orderNumber: order.orderNumber })),
    );
    for (let start = 0; start < lines.length; start += 1000) {
      await tx.insert(orderLines).values(lines.slice(start, start + 1000));
    }
  });
}

// The person's role on the team. A signed-in account that is not on the team yet joins as a clerk.
export async function roleOf(userId: string): Promise<Role> {
  await db.insert(members).values({ userId }).onConflictDoNothing();
  const [row] = await db.select({ role: members.role }).from(members).where(eq(members.userId, userId));
  return row?.role ?? "clerk";
}

export async function setRole(userId: string, role: Role) {
  await db
    .insert(members)
    .values({ userId, role })
    .onConflictDoUpdate({ target: members.userId, set: { role } });
}

type Account = { id: string; name: string; email: string; createdAt: Date };

export async function accountByEmail(email: string): Promise<Account | null> {
  const found = await db.execute<Account>(
    sql`select id, name, email, "createdAt" from "user" where email = ${email.toLowerCase()}`,
  );
  return found.rows[0] ?? null;
}
