import { reader } from "./readonly";

// What the schema tools read: table and column names, types and their comments. Never a row.

export type TableDoc = { name: string; about: string };
export type ColumnDoc = { name: string; type: string; about: string };

export async function listTables(): Promise<{ schema: string; tables: TableDoc[] }> {
  const schema = await reader.query<{ about: string }>(
    "SELECT coalesce(obj_description('marketplace'::regnamespace, 'pg_namespace'), '') AS about",
  );
  const tables = await reader.query<TableDoc>(
    `SELECT relname AS name, coalesce(obj_description(oid, 'pg_class'), '') AS about FROM pg_class
     WHERE relnamespace = 'marketplace'::regnamespace AND relkind = 'r' ORDER BY relname`,
  );
  return { schema: schema.rows[0]?.about ?? "", tables: tables.rows };
}

export async function describeTable(table: string): Promise<ColumnDoc[]> {
  const { rows } = await reader.query<ColumnDoc>(
    `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type,
       coalesce(col_description(a.attrelid, a.attnum), '') AS about
     FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
     WHERE c.relnamespace = 'marketplace'::regnamespace AND c.relname = $1 AND a.attnum > 0
       AND NOT a.attisdropped ORDER BY a.attnum`,
    [table],
  );
  return rows;
}
