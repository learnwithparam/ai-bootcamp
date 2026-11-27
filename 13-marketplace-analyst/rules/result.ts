// A query and its rows. Rows go to the screen. A model only ever gets the shape: column names, column
// types and how many rows there are (shapeOf and describeShape, the only way a result reaches a prompt).

export type Cell = string | number | boolean | null;
export type ColumnType = "number" | "text" | "date" | "boolean";
export type Column = { name: string; type: ColumnType };
export type Result = { columns: Column[]; rows: Cell[][] };
export type Shape = { columns: Column[]; rowCount: number };

export type Query = Result & {
  id: string;
  sql: string;
  // How many times the query was rewritten before this version.
  repairs: number;
  // Why the agent wrote it, shown with the SQL.
  reasoning?: string;
  // Set when the last run failed, already scrubbed of values (rules/safe-error.ts).
  error?: string;
};

export function shapeOf(result: Result): Shape {
  const columns = result.columns.map(({ name, type }) => ({ name, type }));
  return { columns, rowCount: result.rows.length };
}

export function describeShape(query: Query): string {
  if (query.error) return `${query.id}: failed`;
  const { columns, rowCount } = shapeOf(query);
  const listed = columns.map((column) => `${column.name} (${column.type})`).join(", ");
  return `${query.id}: ${rowCount} rows; columns: ${listed}\nSQL: ${query.sql}`;
}

export const describeShapes = (queries: Query[]) => queries.map(describeShape).join("\n\n");

export const succeeded = (queries: Query[]) => queries.filter((query) => !query.error);
