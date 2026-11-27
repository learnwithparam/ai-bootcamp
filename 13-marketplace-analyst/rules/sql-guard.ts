import { parse } from "libpg-query";
import { MAX_ROWS } from "./limits";

// The first of two walls around model-written SQL. Postgres's own parser reads the query, and only one
// SELECT over the marketplace tables gets through. The second wall is the database: the query runs as an
// account that can read those tables and nothing else (db/readonly.ts).

export const TABLES = ["customers", "orders", "order_items", "payments", "reviews", "products", "sellers"];

export type Guarded = { ok: true; sql: string } | { ok: false; why: string };

type Node = Record<string, unknown>;

const WRITES = ["InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"];
// Functions that reach outside a plain read: settings, server files, other servers, running text as SQL.
const BLOCKED_FUNCTION = /^(pg_|lo_|dblink)|^(set_config|current_setting)$|_to_xml/;

// Every node of the parse tree, as [kind, contents].
function* walk(value: unknown): Generator<[string, Node]> {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object" && !Array.isArray(child)) yield [key, child as Node];
    yield* walk(child);
  }
}

function tableProblem(table: Node, ctes: Set<unknown>): string {
  const name = String(table.relname);
  if (table.schemaname && table.schemaname !== "marketplace")
    return `schema ${table.schemaname} is off limits`;
  if (!table.schemaname && ctes.has(name)) return "";
  return TABLES.includes(name) ? "" : `there is no table called ${name}`;
}

function functionProblem(call: Node): string {
  const parts = call.funcname as { String?: { sval?: string } }[];
  const name = (parts.at(-1)?.String?.sval ?? "").toLowerCase();
  return BLOCKED_FUNCTION.test(name) ? `the function ${name} is not allowed` : "";
}

function nodeProblem(kind: string, node: Node, ctes: Set<unknown>): string {
  if (WRITES.includes(kind)) return "only reading is allowed";
  if (kind === "intoClause") return "SELECT INTO creates a table, which is not allowed";
  if (kind === "LockingClause") return "locking rows is not allowed";
  if (kind === "RangeVar") return tableProblem(node, ctes);
  if (kind === "FuncCall") return functionProblem(node);
  return "";
}

function treeProblem(tree: unknown): string {
  const nodes = [...walk(tree)];
  const ctes = new Set(nodes.filter(([kind]) => kind === "CommonTableExpr").map(([, n]) => n.ctename));
  for (const [kind, node] of nodes) {
    const problem = nodeProblem(kind, node, ctes);
    if (problem) return problem;
  }
  return "";
}

async function parsed(sql: string): Promise<{ stmts: { stmt: Node }[] } | string> {
  try {
    return (await parse(sql)) as unknown as { stmts: { stmt: Node }[] };
  } catch (error) {
    console.error("SQL did not parse:", String(error));
    return error instanceof Error ? error.message : String(error);
  }
}

// Returns the query to run, with a row limit around it, or the reason it was refused.
export async function guardSql(sql: string): Promise<Guarded> {
  const tree = await parsed(sql);
  if (typeof tree === "string") return { ok: false, why: tree };
  const [first, second] = tree.stmts ?? [];
  if (!first || second) return { ok: false, why: "send exactly one statement" };
  if (!("SelectStmt" in first.stmt)) return { ok: false, why: "only a SELECT is allowed" };
  const why = treeProblem(first.stmt);
  if (why) return { ok: false, why };
  const bare = sql.trim().replace(/;\s*(--[^\n]*)?$/, "");
  return { ok: true, sql: `SELECT * FROM (\n${bare}\n) AS answer LIMIT ${MAX_ROWS}` };
}
