import { describe, expect, test } from "bun:test";
import { errorAgentPrompt } from "../agent/nodes/error-agent";
import type { State } from "../agent/state";
import {
  brokenProse,
  fillAnswer,
  hasWords,
  missingSlots,
  plainTemplate,
  shown,
  standIns,
  tidy,
  ungroundedNumbers,
} from "../rules/fill-answer";
import type { Query } from "../rules/result";

// The answer the writer is allowed to give, and how code fills it. No model, no database.

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

describe("the slots", () => {
  test("are filled from the rows", () => {
    const { answer, removed } = fillAnswer("{{q2.1.total}} in all.\n{{q1.list}}", [months, total]);
    expect(answer).toContain("99,441 in all.");
    expect(answer).toContain("2018-01: 7,269");
    expect(removed).toEqual([]);
  });

  test("a slot with no value behind it is removed and counted", () => {
    const { answer, removed } = fillAnswer("{{q1.9.orders}} and {{q1.1.revenue}} and {{q7.list}}", [months]);
    expect(answer).not.toContain("{{");
    expect(removed).toHaveLength(3);
  });

  test("a result the answer skips is noticed, and code can write it instead", () => {
    expect(missingSlots("Machinery, then toys.", [months, total])).toEqual(["q1", "q2"]);
    expect(missingSlots("{{q1.list}} {{q2.1.total}}", [months, total])).toEqual([]);
    expect(missingSlots(plainTemplate([months, total]), [months, total])).toEqual([]);
  });

  test("a figure the model typed itself is caught", () => {
    expect(ungroundedNumbers("In 2018 there were {{q1.1.orders}}.", "Orders?", [months])).toEqual([]);
    expect(ungroundedNumbers("About 7,000 orders.", "Orders?", [months])).toEqual(["7,000"]);
  });
});

test("a judge reads slots as words, and a bare list is not an answer", () => {
  const columns = [
    { name: "state", type: "text" as const },
    { name: "order_count", type: "number" as const },
  ];
  const queries = [{ id: "q1", sql: "", columns, rows: [["SP", 3]], repairs: 0 }];
  const read = standIns("{{q1.1.order_count}} orders: {{q1.list}}", queries);
  expect(read).toBe("(order count) orders: (a list of state and order count)");
  expect(hasWords("{{q1.list}}\n")).toBe(false);
  expect(hasWords("Orders by state: {{q1.list}}")).toBe(true);
});

test("a currency sign stays on money and leaves a count", () => {
  const columns = [
    { name: "late_orders", type: "number" as const },
    { name: "total_sales", type: "number" as const },
  ];
  const queries = [{ id: "q1", sql: "", columns, rows: [[7, 20]], repairs: 0 }];
  const { answer } = fillAnswer("R$ {{q1.1.late_orders}} late, R$ {{q1.1.total_sales}} sold", queries);
  expect(answer).toBe("7 late, R$ 20 sold");
});

test("a full stop typed after a list slot is not left standing under the list", () => {
  const columns = [{ name: "state", type: "text" as const }];
  const queries = [{ id: "q1", sql: "", columns, rows: [["SP"], ["RJ"]], repairs: 0 }];
  expect(fillAnswer("The states are {{q1.list}}.", queries).answer).toBe("The states are \n\n- SP\n- RJ");
});

test("the saved template loses the same currency sign the screen does", () => {
  expect(tidy("R$ {{q1.1.percent_late}}% were late.")).toBe("{{q1.1.percent_late}}% were late.");
});

test("the repair agent is told the errors it has already caused", () => {
  const state = { question: "q", queries: [], errors: ["cannot cast type interval to numeric"] };
  expect(errorAgentPrompt(state as unknown as State)).toContain("cannot cast type interval");
});

test("days are a measure, a day or an id is a name", () => {
  expect(shown(11.830115, "median_days")).toBe("11.83");
  expect(shown(2018, "order_year")).toBe("2018");
  expect(shown(14409, "zip_code_prefix")).toBe("14409");
});

test("a brace left outside a slot is a fault, so it never reaches the screen", () => {
  expect(brokenProse("Orders by month are {{q1.list}}}}")).toBe(true);
  expect(brokenProse("There were {{q2.1.total}} orders.")).toBe(false);
});

test("filler after the last list is dropped, a later value is kept", () => {
  expect(tidy("Top sellers:\n{{q1.list}}\nNo further details are provided.")).toBe(
    "Top sellers:\n{{q1.list}}",
  );
  expect(tidy("{{q1.list}} In all {{q2.1.total}}.")).toBe("{{q1.list}} In all {{q2.1.total}}.");
});
