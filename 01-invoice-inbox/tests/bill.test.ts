import { describe, expect, test } from "bun:test";
import { dueLabel, dueOn, duplicateProblem, may, parseAmount, suggestFix } from "../rules/bill";
import type { Invoice } from "../rules/invoice";
import { checkFields, fieldSummary, moneyCents, type Word } from "../rules/locate";
import type { Problem, PurchaseOrder } from "../rules/match";

// The rules around a bill: when it is due, who may do what, and the fix the clerk sees first. No model, no database.

const order: PurchaseOrder = {
  orderNumber: 10250,
  customer: "Hanari Carnes",
  orderedOn: "2016-07-08",
  shippedOn: "2016-07-12",
  lines: [
    { product: "Manjimup Dried Apples", unitPriceCents: 4240, quantity: 35, discountPercent: 15 },
    { product: "Jack's New England Clam Chowder", unitPriceCents: 770, quantity: 10, discountPercent: 0 },
  ],
};

const invoice: Invoice = {
  invoiceNumber: "10250",
  customer: "Hanari Carnes",
  invoiceDate: "2016-07-08",
  lines: [
    { product: "Manjimup Dried Apples", unitPrice: 42.4, quantity: 35, lineTotal: 1484 },
    { product: "Jack's New England Clam Chowder", unitPrice: 7.7, quantity: 10, lineTotal: 77 },
  ],
  total: 1561,
};

const problem = (kind: Problem["kind"]): Problem => ({ kind, message: kind });

describe("when a bill is due", () => {
  const received = new Date("2026-11-01T09:00:00Z");

  test("a bill is due thirty days after it arrives", () => {
    expect(dueOn(received).toISOString()).toBe("2026-12-01T09:00:00.000Z");
  });

  test("the label counts whole days and says when it is late", () => {
    const due = dueOn(received);
    expect(dueLabel(due, new Date("2026-11-27T23:00:00Z"))).toEqual({
      text: "Due in 4 days",
      overdue: false,
    });
    expect(dueLabel(due, new Date("2026-11-30T00:00:00Z"))).toEqual({ text: "Due in 1 day", overdue: false });
    expect(dueLabel(due, new Date("2026-12-01T22:00:00Z"))).toEqual({ text: "Due today", overdue: false });
    expect(dueLabel(due, new Date("2026-12-03T01:00:00Z"))).toEqual({
      text: "Overdue by 2 days",
      overdue: true,
    });
  });
});

describe("a bill sent twice", () => {
  test("the second copy points at the first", () => {
    const found = duplicateProblem("10250", [
      { id: "a", number: "10249" },
      { id: "b", number: "10250" },
    ]);
    expect(found?.duplicateOf).toBe("b");
    expect(found?.problem.kind).toBe("duplicate");
  });

  test("a new number is not a duplicate", () => {
    expect(duplicateProblem("10251", [{ id: "a", number: "10250" }])).toBeNull();
  });
});

describe("who may do what", () => {
  test("a clerk reviews but never approves or pays", () => {
    expect(may("clerk", "review")).toBe(true);
    expect(may("clerk", "approve")).toBe(false);
    expect(may("clerk", "pay")).toBe(false);
  });

  test("an approver may do all three", () => {
    expect(["review", "approve", "pay"].every((action) => may("approver", action as "pay"))).toBe(true);
  });
});

describe("the amount a clerk types", () => {
  test("plain, comma and dollar amounts are read in cents", () => {
    expect(parseAmount("1484", 156100)).toBe(148400);
    expect(parseAmount("$1,484.50", 156100)).toBe(148450);
  });

  test("nothing, zero, too many decimals or more than the bill is refused", () => {
    for (const text of ["", "0", "-5", "12.345", "abc", "1561.01"])
      expect(parseAmount(text, 156100)).toBeNull();
  });
});

describe("the fix the clerk sees first", () => {
  test("no problems, no fix", () => {
    expect(suggestFix(invoice, order, [])).toBeNull();
  });

  test("a duplicate is rejected even when the price is also wrong", () => {
    expect(suggestFix(invoice, order, [problem("price"), problem("duplicate")])?.kind).toBe("reject");
  });

  test("no order or no delivery is held", () => {
    expect(suggestFix(invoice, undefined, [problem("no-order")])?.kind).toBe("hold");
    expect(suggestFix(invoice, order, [problem("not-received")])?.kind).toBe("hold");
  });

  test("a price above the order is paid at the agreed price, with a credit note for the rest", () => {
    const fix = suggestFix(invoice, order, [problem("price")]);
    expect(fix).toMatchObject({ kind: "pay", payCents: 126140 + 7700 });
    expect(fix?.reason).toBe(
      "Pay $1,338.40, the order's agreed prices, and ask for a credit note for the $222.60 over.",
    );
  });
});

describe("finding each field on the page", () => {
  const word = (text: string, x: number, y: number): Word => ({ text, x, y, width: 40, height: 10 });
  const page = {
    width: 612,
    height: 792,
    words: [
      word("10250", 100, 50),
      word("Hanari Carnes", 100, 65),
      word("2016-07-08", 100, 80),
      word("Manjimup Dried Apples", 50, 200),
      word("$42.40", 250, 200),
      word("35", 330, 200),
      word("$1484.00", 400, 200),
      word("Total:", 330, 260),
      word("$1561.00", 400, 260),
    ],
  };
  const one = { ...invoice, lines: invoice.lines.slice(0, 1) };

  test("money matches with or without commas", () => {
    expect(moneyCents("$1,484.00")).toBe(moneyCents("1484"));
  });

  test("every field printed on the page gets a box, on its own row", () => {
    const checks = checkFields(one, page);
    expect(checks.every((check) => check.box)).toBe(true);
    expect(checks.find((check) => check.key === "line-0-quantity")?.box?.x).toBe(330);
    expect(fieldSummary(checks)).toBe("All 8 fields were found on the page.");
  });

  test("a field the page does not show has no box, and the summary says so", () => {
    const checks = checkFields({ ...one, customer: "Someone Else" }, page);
    expect(checks.find((check) => check.key === "customer")?.box).toBeNull();
    expect(fieldSummary(checks)).toBe("1 of 8 fields were not found on the page. Check them by eye.");
    expect(fieldSummary(checkFields(one, { ...page, words: [] }))).toContain("It may be a scan");
  });
});
