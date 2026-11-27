import { Pool } from "pg";
import { toCell, typeOf } from "../rules/cells";
import type { Result } from "../rules/result";
import { guardSql } from "../rules/sql-guard";

// The only door for model-written SQL. It signs in as marketplace_reader (see the reader-role migration):
// read-only, eight seconds a query, and no rights on any other schema.

function readerUrl(): string {
  const setting = process.env.DATABASE_URL;
  if (!setting) throw new Error("DATABASE_URL is not set. Add it to .env (see .env.example).");
  const url = new URL(setting);
  url.username = "marketplace_reader";
  url.password = "marketplace_reader";
  return url.toString();
}

export const reader = new Pool({ connectionString: readerUrl(), max: 4 });

// Throws with Postgres's own message, or the guard's reason, so the error agent can repair the query.
export async function runSelect(sql: string): Promise<Result> {
  const guarded = await guardSql(sql);
  if (!guarded.ok) throw new Error(guarded.why);
  // The extended protocol takes one statement only, whatever the text holds.
  const query = { text: guarded.sql, rowMode: "array" as const, queryMode: "extended" };
  const result = await reader.query<unknown[]>(query);
  const ids = result.fields.map((field) => field.dataTypeID);
  return {
    columns: result.fields.map((field) => ({ name: field.name, type: typeOf(field.dataTypeID) })),
    rows: result.rows.map((row) => row.map((value, i) => toCell(value, ids[i] ?? 0))),
  };
}
