import { parse } from "libpg-query";
import { MAX_ROWS } from "./limits";

// The first of two walls around model-written SQL. Postgres's own parser reads the query, and only one
// SELECT over the marketplace tables gets through. The second wall is the database: the query runs as an
// account that can read those tables and nothing else (db/readonly.ts).

export const TABLES = ["customers", "orders", "order_items", "payments", "reviews", "products", "sellers"];

export type Guarded = { ok: true; sql: string } | { ok: false; why: string };

type Node = Record<string, unknown>;

const WRITES = ["InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"];
// The only functions a query may call. A list of what is allowed, because Postgres has many functions
// that read settings or files, or run text as SQL, and a list of banned ones always misses some.
const FUNCTIONS = new Set(
  [
    "count sum avg min max stddev stddev_pop stddev_samp variance var_pop var_samp corr covar_pop covar_samp",
    "regr_slope regr_intercept percentile_cont percentile_disc mode bool_and bool_or every string_agg array_agg",
    "row_number rank dense_rank percent_rank cume_dist ntile lag lead first_value last_value nth_value",
    "round floor ceil ceiling trunc abs sign mod power sqrt exp ln log width_bucket",
    "extract date_part date_trunc date_bin age make_date to_char to_date to_timestamp to_number now timezone",
    "justify_interval isfinite overlaps lower upper initcap length char_length substring substr left right",
    "trim btrim ltrim rtrim lpad rpad replace overlay split_part concat concat_ws format strpos position",
    "starts_with regexp_replace regexp_match similar_to_escape like_escape",
    "unnest generate_series cardinality array_length array_to_string",
  ]
    .join(" ")
    .split(" "),
);

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
  const parts = (call.funcname as { String?: { sval?: string } }[]).map((part) => part.String?.sval ?? "");
  const [schema, name = ""] = parts.length > 1 ? parts : ["pg_catalog", ...parts];
  return schema === "pg_catalog" && FUNCTIONS.has(name.toLowerCase())
    ? ""
    : `the function ${name} is not allowed`;
}

function nodeProblem(kind: string, node: Node, ctes: Set<unknown>): string {
  if (WRITES.includes(kind)) return "only reading is allowed";
  if (kind === "intoClause") return "SELECT INTO creates a table, which is not allowed";
  if (kind === "LockingClause") return "locking rows is not allowed";
  if (kind === "RangeVar") return tableProblem(node, ctes);
  if (kind === "FuncCall") return functionProblem(node);
  return "";
}

// A WITH name counts as a table anywhere in the query, though Postgres only sees it inside its own part.
// Outside that part the same name would reach a system catalog, and every catalog name starts with pg_.
function treeProblem(tree: unknown): string {
  const nodes = [...walk(tree)];
  const ctes = new Set(nodes.filter(([kind]) => kind === "CommonTableExpr").map(([, n]) => n.ctename));
  const catalog = [...ctes].find((name) => String(name).startsWith("pg_"));
  if (catalog) return `there is no table called ${catalog}, and a WITH query cannot take that name`;
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
