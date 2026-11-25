import { and, asc, eq, isNotNull } from "drizzle-orm";
import { type ConnectorForm, type SignIn, slugOf } from "../rules/connectors";
import { db } from "./queries";
import { connections, connectors } from "./schema";
import { open, seal } from "./sealed";

// What pages show about a connector. The client secret never leaves this file unsealed except to the OAuth client.
const publicColumns = {
  id: connectors.id,
  name: connectors.name,
  slug: connectors.slug,
  url: connectors.url,
};
export type PublicConnector = { id: string; name: string; slug: string; url: string };
export type ConnectorSecrets = PublicConnector & SignIn & { clientId: string; clientSecret: string };

export async function allConnectors(): Promise<PublicConnector[]> {
  return db.select(publicColumns).from(connectors).orderBy(asc(connectors.name));
}

export async function connectorSecrets(id: string): Promise<ConnectorSecrets | null> {
  const [row] = await db.select().from(connectors).where(eq(connectors.id, id));
  return row ? { ...row, clientSecret: open(row.clientSecret) } : null;
}

export async function addConnector(form: ConnectorForm, signIn: SignIn, addedBy: string): Promise<string> {
  const [made] = await db
    .insert(connectors)
    .values({
      name: form.name.trim(),
      slug: slugOf(form.name),
      url: form.url.trim(),
      ...signIn,
      clientId: form.clientId.trim(),
      clientSecret: seal(form.clientSecret.trim()),
      addedBy,
    })
    .returning({ id: connectors.id });
  if (!made) throw new Error("The connector was not saved.");
  return made.id;
}

// Removing a connector removes everyone's tokens for it too.
export async function removeConnector(id: string): Promise<void> {
  await db.delete(connectors).where(eq(connectors.id, id));
}

// One person's saved sign-in values for one connector, unsealed.
export type Connection = { tokens?: string; codeVerifier?: string; state?: string };
type Field = keyof Connection;

const where = (connectorId: string, userId: string) =>
  and(eq(connections.connectorId, connectorId), eq(connections.userId, userId));

export async function connectionOf(connectorId: string, userId: string): Promise<Connection> {
  const [row] = await db.select().from(connections).where(where(connectorId, userId));
  const read = (value: string | null | undefined) => (value ? open(value) : undefined);
  return { tokens: read(row?.tokens), codeVerifier: read(row?.codeVerifier), state: read(row?.state) };
}

// Saves one value, sealed. undefined clears it.
export async function saveConnection(connectorId: string, userId: string, field: Field, value?: string) {
  const sealed = value === undefined ? null : seal(value);
  await db
    .insert(connections)
    .values({ connectorId, userId, [field]: sealed })
    .onConflictDoUpdate({
      target: [connections.connectorId, connections.userId],
      set: { [field]: sealed, updatedAt: new Date() },
    });
}

export async function disconnect(connectorId: string, userId: string): Promise<void> {
  await db.delete(connections).where(where(connectorId, userId));
}

// The connectors this person has signed in to.
export async function connectedIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: connections.connectorId })
    .from(connections)
    .where(and(eq(connections.userId, userId), isNotNull(connections.tokens)));
  return rows.map((row) => row.id);
}
