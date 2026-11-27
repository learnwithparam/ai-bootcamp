import { createReadStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { pool } from "@bootcamp/db";
import type { PoolClient } from "pg";
import { from as copyFrom } from "pg-copy-streams";
import { CATEGORY_FILE, SOURCES, type Source } from "../rules/dataset";

// Fills the marketplace tables with Postgres's own CSV reader (COPY), all in one transaction:
// either every table is loaded with the expected rows, or nothing changes.

async function copy(client: PoolClient, target: string, file: string) {
  const stream = client.query(copyFrom(`COPY ${target} FROM STDIN WITH (FORMAT csv, HEADER true)`));
  await pipeline(createReadStream(file), stream);
}

async function loadTable(client: PoolClient, folder: string, source: Source) {
  const table = `marketplace.${source.table}`;
  await client.query(`TRUNCATE ${table}`);
  await copy(client, `${table} (${source.columns})`, join(folder, source.file));
  const { rows } = await client.query(`SELECT count(*)::int AS count FROM ${table}`);
  if (rows[0].count !== source.rows) {
    throw new Error(`${table} holds ${rows[0].count} rows, expected ${source.rows}.`);
  }
  console.log(`  ${table}: ${source.rows} rows`);
}

async function translateCategories(client: PoolClient, folder: string) {
  await client.query("CREATE TEMP TABLE names (portuguese text, english text) ON COMMIT DROP");
  await copy(client, "names", join(folder, CATEGORY_FILE));
  await client.query(
    "UPDATE marketplace.products SET category = names.english FROM names WHERE category = names.portuguese",
  );
}

export async function loadTables(folder: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const source of SOURCES) await loadTable(client, folder, source);
    await translateCategories(client, folder);
    await client.query("COMMIT");
    await client.query("ANALYZE");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// True when every table already holds its rows, so running setup again does nothing.
export async function tablesLoaded(): Promise<boolean> {
  for (const source of SOURCES) {
    const { rows } = await pool.query(`SELECT count(*)::int AS count FROM marketplace.${source.table}`);
    if (rows[0].count !== source.rows) return false;
  }
  return true;
}
