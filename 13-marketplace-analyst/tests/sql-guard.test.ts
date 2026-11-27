import { describe, expect, test } from "bun:test";
import { CASES } from "../agent/evals/cases";
import { guardSql } from "../rules/sql-guard";

// The first wall around model-written SQL. No database and no model.

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
    ["SELECT * FROM (WITH pg_roles AS (SELECT 1) SELECT 1) x, pg_roles", "no table called pg_roles"],
    ["SELECT * FROM ts_stat('SELECT 1')", "ts_stat"],
    ["SELECT public.count(1)", "count"],
    ["SELEC 1", "syntax error"],
  ])("refuses %s", async (sql, why) => {
    const result = await guardSql(sql);
    expect(result.ok ? "allowed" : result.why).toContain(why);
  });
});

describe("what the SQL guard lets through", () => {
  test("lets through the functions an analyst needs, however Postgres spells them", async () => {
    const sql = `SELECT date_trunc('month', purchased_at) AS month, round(avg(extract(epoch FROM
      delivered_at - purchased_at) / 86400), 1), count(*) FILTER (WHERE status SIMILAR TO 'deliv%'),
      substring(min(status) FROM 1 FOR 3), trim(max(status)), position('a' IN max(status)),
      percentile_cont(0.5) WITHIN GROUP (ORDER BY purchased_at - approved_at),
      rank() OVER (ORDER BY count(*)) FROM orders GROUP BY 1`;
    expect(await guardSql(sql)).toMatchObject({ ok: true });
  });

  test("lets every reference query of the gold set through", async () => {
    const gold = CASES.flatMap((one) => one.sql ?? []);
    expect(gold.length).toBeGreaterThan(0);
    for (const sql of gold) expect(await guardSql(sql)).toMatchObject({ ok: true });
  });

  test("lets a read through, with a row limit around it", async () => {
    const sql = "WITH paid AS (SELECT order_id FROM payments) SELECT count(*) FROM paid; -- done";
    const result = await guardSql(sql);
    expect(result.ok && result.sql).toEndWith(") AS answer LIMIT 200");
    expect(result.ok && result.sql).not.toContain(";");
  });
});
