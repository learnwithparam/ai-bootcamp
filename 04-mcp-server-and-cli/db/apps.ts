import { sql } from "drizzle-orm";
import { db } from "./queries";

// The apps an account has let act as it: Claude, Cursor, the CLI, a web app. The rows belong to better-auth's
// OAuth tables. An app holds a grant while it has a consent or a refresh token that is not revoked or expired.

export type ConnectedApp = {
  clientId: string;
  name: string;
  how: "device" | "browser" | "server";
  scopes: string[];
  connectedAt: Date;
  lastUsed: Date | null;
};

const LIVE_TOKEN = sql`r.revoked is null and r."expiresAt" > now()`;

export async function appsOf(userId: string): Promise<ConnectedApp[]> {
  const { rows } = await db.execute<{
    clientId: string;
    name: string | null;
    grants: string[];
    auth: string | null;
    scopes: string[] | null;
    connectedAt: Date;
    lastUsed: Date | null;
  }>(sql`
    select c."clientId", c.name, c."grantTypes" as grants, c."tokenEndpointAuthMethod" as auth,
      (select array_agg(distinct s) from (
        select jsonb_array_elements_text(scopes) s from "oauthConsent" where "userId" = ${userId} and "clientId" = c."clientId"
        union select jsonb_array_elements_text(scopes) from "oauthRefreshToken" r
          where r."userId" = ${userId} and r."clientId" = c."clientId" and ${LIVE_TOKEN}) all_scopes) as scopes,
      least(
        (select min("createdAt") from "oauthConsent" where "userId" = ${userId} and "clientId" = c."clientId"),
        (select min("createdAt") from "oauthRefreshToken" r
          where r."userId" = ${userId} and r."clientId" = c."clientId" and ${LIVE_TOKEN})) as "connectedAt",
      (select max(t.called_at) from mcp_server.tool_calls t
        where t.user_id = ${userId} and t.client_id = c."clientId") as "lastUsed"
    from "oauthClient" c
    where exists (select 1 from "oauthConsent" where "userId" = ${userId} and "clientId" = c."clientId")
       or exists (select 1 from "oauthRefreshToken" r
          where r."userId" = ${userId} and r."clientId" = c."clientId" and ${LIVE_TOKEN})
    order by "connectedAt" desc`);
  return rows.map((row) => ({
    clientId: row.clientId,
    name: row.name ?? "An unnamed app",
    how: row.grants.includes("urn:ietf:params:oauth:grant-type:device_code")
      ? "device"
      : row.auth === "none"
        ? "browser"
        : "server",
    scopes: row.scopes ?? [],
    connectedAt: new Date(row.connectedAt),
    lastUsed: row.lastUsed ? new Date(row.lastUsed) : null,
  }));
}

// The /mcp route asks this on every call, so a revoked app is refused at once, not when its token expires.
export async function hasGrant(userId: string, clientId: string): Promise<boolean> {
  const { rows } = await db.execute<{ live: boolean }>(sql`
    select exists (select 1 from "oauthConsent" where "userId" = ${userId} and "clientId" = ${clientId})
        or exists (select 1 from "oauthRefreshToken" r
          where r."userId" = ${userId} and r."clientId" = ${clientId} and ${LIVE_TOKEN}) as live`);
  return rows[0]?.live ?? false;
}

// One transaction: the consent goes and every token is marked revoked, so the app must ask again.
export async function revokeApp(userId: string, clientId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const consents = await tx.execute(
      sql`delete from "oauthConsent" where "userId" = ${userId} and "clientId" = ${clientId}`,
    );
    const tokens = await tx.execute(sql`update "oauthRefreshToken" set revoked = now()
      where "userId" = ${userId} and "clientId" = ${clientId} and revoked is null`);
    await tx.execute(sql`update "oauthAccessToken" set revoked = now()
      where "userId" = ${userId} and "clientId" = ${clientId} and revoked is null`);
    return (consents.rowCount ?? 0) + (tokens.rowCount ?? 0) > 0;
  });
}
