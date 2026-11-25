import { spawn } from "node:child_process";
import { pool } from "@bootcamp/db";

// The agent sends real requests to the legal intake portal. Tests remove the ones they made,
// with the paused graph state 07 keeps for each, so the lawyer's queue stays clean.
export async function removePortalRequests(clientEmails: string[]) {
  if (clientEmails.length === 0) return;
  const { rows } = await pool.query<{ id: string }>(
    "delete from legal_intake.intakes where client_email = any($1) returning id",
    [clientEmails],
  );
  const ids = rows.map((row) => row.id);
  for (const table of ["checkpoint_writes", "checkpoint_blobs", "checkpoints"])
    await pool.query(`delete from legal_intake_graph.${table} where thread_id = any($1)`, [ids]);
}

async function isUp(url: string): Promise<boolean> {
  const response = await fetch(url, { signal: AbortSignal.timeout(2_000) }).catch(() => undefined);
  return response?.ok ?? false;
}

// Uses a server you already run, or starts one for the test. Returns a stop function for the one it started.
export async function ensureRunning(slug: string, url: string): Promise<() => void> {
  if (await isUp(url)) return () => {};
  const server = spawn("bun", ["scripts/dev.ts", slug], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp(url)) return () => server.pid && process.kill(-server.pid);
    await Bun.sleep(1_000);
  }
  throw new Error(`${slug} did not start on ${url}.`);
}
