import { describe, expect, test } from "bun:test";
import { getTableColumns, getTableName } from "drizzle-orm";
import { describeTable, listTables } from "../db/catalog";
import { DATA_TABLES } from "../db/data-schema";
import { runSelect } from "../db/readonly";
import { chartable, chartFrom, worthCharting } from "../rules/chart-spec";
import { SOURCES } from "../rules/dataset";
import { type Query, shapeOf } from "../rules/result";
import { safeError } from "../rules/safe-error";
import { guardSql, TABLES } from "../rules/sql-guard";

// The rules that keep the agents honest, with no model. The read-only tests need Postgres with the
// migrations applied, not the data.

describe("the SQL guard", () => {
  test.each([
    ["DELETE FROM orders", "only a SELECT"],
    ["DROP TABLE orders", "only a SELECT"],
    ["SELECT 1; DELETE FROM orders", "exactly one statement"],
    ["WITH gone AS (DELETE FROM orders RETURNING *) SELECT * FROM gone", "only reading"],
    ["SELECT * INTO copy FROM orders", "SELECT INTO"],
    ["SELECT * FROM orders FOR UPDATE", "locking"],
    ["SELECT * FROM public.user", "schema public"],
    ["SELECT * FROM pg_user", "no table called pg_user"],
    ["SELECT set_config('role', 'bootcamp', false)", "set_config"],
    ["SELECT pg_sleep(60)", "pg_sleep"],
    ["SELECT query_to_xml('select 1', true, true, '')", "query_to_xml"],
    ["SELEC 1", "syntax error"],
  ])("refuses %s", async (sql, why) => {
    const result = await guardSql(sql);
    expect(result.ok ? "allowed" : result.why).toContain(why);
  });

  test("lets a read through, with a row limit around it", async () => {
    const sql = "WITH paid AS (SELECT order_id FROM payments) SELECT count(*) FROM paid; -- done";
    const result = await guardSql(sql);
    expect(result.ok && result.sql).toEndWith(") AS answer LIMIT 200");
    expect(result.ok && result.sql).not.toContain(";");
  });

  test("knows exactly the tables the schema defines and the loader fills", () => {
    const defined = DATA_TABLES.map((table) => getTableName(table)).sort();
    expect([...TABLES].sort()).toEqual(defined);
    expect(SOURCES.map((source) => source.table).sort()).toEqual(defined);
  });

  test("each file's columns are the table's columns, in order", () => {
    for (const table of DATA_TABLES) {
      const names = Object.values(getTableColumns(table)).map((column) => column.name);
      expect(SOURCES.find((source) => source.table === getTableName(table))?.columns).toBe(names.join(", "));
    }
  });
});

describe("the read-only account", () => {
  test("runs a read and returns plain numbers", async () => {
    expect(await runSelect("SELECT 2 + 2 AS four, 1.5::numeric AS half")).toEqual({
      columns: [
        { name: "four", type: "number" },
        { name: "half", type: "number" },
      ],
      rows: [[4, 1.5]],
    });
  });

  // These skip the guard and talk to Postgres directly: the account itself must refuse.
  test.each(["DELETE FROM marketplace.orders", 'SELECT * FROM public."user"'])("cannot %s", async (sql) => {
    const { reader } = await import("../db/readonly");
    await expect(reader.query(sql)).rejects.toThrow(/read-only|permission denied/);
  });
});

describe("the schema tools", () => {
  test("describe every table and column in words, and hold no rows", async () => {
    const { schema, tables } = await listTables();
    expect(schema).toContain("marketplace");
    expect(tables.map((table) => table.name).sort()).toEqual([...TABLES].sort());
    for (const table of tables) {
      expect(table.about).not.toBe("");
      const columns = await describeTable(table.name);
      expect(columns.filter((column) => !column.about)).toEqual([]);
      expect(Object.keys(columns[0] ?? {}).sort()).toEqual(["about", "name", "type"]);
    }
  });

  test("a table name is a value, never part of the SQL", async () => {
    expect(await describeTable("orders'; DROP TABLE orders; --")).toEqual([]);
  });
});

const months: Query = {
  id: "q1",
  sql: "SELECT month, count(*) AS orders FROM orders WHERE year = 2018 GROUP BY month",
  columns: [
    { name: "month", type: "text" },
    { name: "orders", type: "number" },
  ],
  rows: [
    ["2018-01", 7269],
    ["2018-02", 6728],
  ],
  repairs: 0,
};
const total: Query = { ...months, id: "q2", columns: [{ name: "total", type: "number" }], rows: [[99441]] };

describe("what may reach a model", () => {
  test("a shape is names, types and a count", () => {
    expect(shapeOf(months)).toEqual({ columns: months.columns, rowCount: 2 });
    expect(JSON.stringify(shapeOf(months))).not.toContain("7269");
  });

  test("a database error loses any value it quotes", () => {
    const sql = "SELECT city::int FROM customers";
    expect(safeError('invalid input syntax for type integer: "sao paulo"', sql)).toBe(
      'invalid input syntax for type integer: "..."',
    );
    expect(safeError('column "city" does not exist\nLINE 1: x', sql)).toBe('column "city" does not exist');
  });
});

describe("the chart", () => {
  const spec = { kind: "line", query: "q1", x: "month", y: "orders", title: "Orders" } as const;

  test("draws only columns the query returned", () => {
    expect(chartFrom(spec, [months])?.points).toEqual([
      { x: "2018-01", y: 7269 },
      { x: "2018-02", y: 6728 },
    ]);
    expect(chartFrom({ ...spec, y: "revenue" }, [months])).toBeUndefined();
    expect(chartFrom({ ...spec, query: "q9" }, [months])).toBeUndefined();
    expect(chartFrom({ ...spec, x: "orders", y: "month" }, [months])).toBeUndefined();
    expect(chartFrom({ ...spec, kind: "scatter" }, [months])).toBeUndefined();
  });

  test("one row is nothing to draw", () => {
    expect(chartable(total)).toBe(false);
    expect(chartable(months)).toBe(true);
  });
});

test("a grouped result is charted, a list of records is not", () => {
  const columns = [
    { name: "state", type: "text" as const },
    { name: "total", type: "number" as const },
  ];
  const rows = [
    ["SP", 3],
    ["RJ", 2],
  ];
  const grouped = {
    id: "q1",
    sql: "SELECT state, count(*) FROM sellers GROUP  BY state",
    columns,
    rows,
    repairs: 0,
  };
  expect(worthCharting(grouped)).toBe(true);
  expect(worthCharting({ ...grouped, sql: "SELECT state, total FROM sellers" })).toBe(false);
  expect(worthCharting({ ...grouped, rows: rows.slice(0, 1) })).toBe(false);
});
