import { describe, expect, test } from "bun:test";
import { RunInput, turnOf } from "../app/api/agent/input";
import { fitBasket } from "../rules/basket";
import { chips, NEW_PROFILE, type Profile, whyNot, withoutChip } from "../rules/profile";
import { ASKS_PER_DAY, LONGEST_ASK, limitMessage, SHOP_SPEND_PER_DAY } from "../rules/state";
import {
  CRISPS,
  LENTILS,
  MUESLI,
  OATS,
  PEANUT_BUTTER,
  PEANUTS,
  product,
  SHELF,
  VEGAN,
  YOGHURT,
} from "./shelf";

// The rules that decide what a shopper sees, with no model. The shop's products are in tests/shelf.ts.

describe("what a shopper may see", () => {
  test("an allergen on the label or in the may-contain list keeps a product off the page", () => {
    expect(whyNot(PEANUT_BUTTER, PEANUTS)).toBe("contains peanuts");
    expect(whyNot(MUESLI, PEANUTS)).toBe("may contain peanuts");
    expect(whyNot(OATS, PEANUTS)).toBeNull();
  });

  test("a diet the label does not confirm counts as not met", () => {
    expect(whyNot(YOGHURT, VEGAN)).toBe("not labelled vegan");
    expect(whyNot(CRISPS, VEGAN)).toBe("not labelled vegan");
    expect(whyNot(YOGHURT, { ...NEW_PROFILE, diet: "vegetarian" })).toBeNull();
  });

  test("a vegan label that its own allergens contradict is not trusted", () => {
    const PIZZA = product("8", {
      name: "Chicken pizza",
      allergens: ["eggs", "gluten", "milk"],
      diet: "vegan",
    });
    const PRAWNS = product("9", { name: "Prawn crackers", allergens: ["crustaceans"], diet: "vegetarian" });
    expect(whyNot(PIZZA, VEGAN)).toBe("not labelled vegan");
    expect(whyNot(PRAWNS, { ...NEW_PROFILE, diet: "vegetarian" })).toBe("not labelled vegetarian");
    expect(whyNot(LENTILS, VEGAN)).toBeNull();
  });
});

describe("the basket", () => {
  test("the dearest lines come off until the total fits the budget, added up here and not by the model", () => {
    const profile: Profile = { ...PEANUTS, budgetPence: 1000 };
    const proposal = fitBasket(
      [
        { code: "7", quantity: 1 },
        { code: "5", quantity: 2 },
        { code: "2", quantity: 1 },
        { code: "1", quantity: 40 },
      ],
      SHELF,
      profile,
    );
    // Rice £9, lentils 2 x £1.50, oats capped at 6 x £2: £24 in all. Oats come off, then rice.
    expect(proposal.lines.map((line) => [line.code, line.quantity])).toEqual([["5", 2]]);
    expect(proposal.totalPence).toBe(300);
    expect(proposal.removed.map((one) => [one.code, one.why])).toEqual([
      ["2", "contains peanuts"],
      ["1", "over the £10.00 budget"],
      ["7", "over the £10.00 budget"],
    ]);
  });
});

describe("the shopper's profile chips", () => {
  test("each chip says what the shop believes, and its cross takes that one belief away", () => {
    const profile: Profile = { ...VEGAN, avoid: ["peanuts", "sesame-seeds"], budgetPence: 4000, people: 2 };
    expect(chips(profile).map((one) => one.label)).toEqual([
      "Vegan",
      "No peanuts",
      "No sesame",
      "Under £40 a week",
      "For 2",
    ]);
    expect(withoutChip(profile, "avoid:peanuts").avoid).toEqual(["sesame-seeds"]);
    expect(withoutChip(profile, "budget").budgetPence).toBeNull();
    expect(chips(NEW_PROFILE)).toEqual([]);
  });
});

describe("what the page sends", () => {
  const input = (last: { role: string; content: unknown; toolCallId?: string }) =>
    RunInput.parse({
      threadId: "t",
      runId: "r",
      messages: [
        { id: "m0", role: "user", content: "Vegan" },
        { id: "m1", ...last },
      ],
      state: { profile: NEW_PROFILE },
    });

  test("the shopper's words start a layout, and an answer to the basket card is read as yes or no", () => {
    expect(turnOf(input({ role: "user", content: "No nuts" }))).toEqual({ kind: "ask", said: "No nuts" });
    expect(turnOf(input({ role: "tool", toolCallId: "c1", content: '{"answer":"yes"}' }))).toEqual({
      kind: "answer",
      toolCallId: "c1",
      yes: true,
    });
    expect(turnOf(input({ role: "tool", toolCallId: "c1", content: '"{\\"answer\\":\\"no\\"}"' }))).toEqual({
      kind: "answer",
      toolCallId: "c1",
      yes: false,
    });
  });

  test("an empty, overlong or unreadable turn is refused with a plain sentence", () => {
    expect(turnOf(input({ role: "user", content: "  " })).kind).toBe("bad");
    expect(turnOf(input({ role: "user", content: "x".repeat(LONGEST_ASK + 1) })).kind).toBe("bad");
    expect(turnOf(input({ role: "tool", toolCallId: "c1", content: "sure" })).kind).toBe("bad");
  });

  test("a shopper over the day's asks, or the shop over the day's spend, is told to come back tomorrow", () => {
    expect(limitMessage({ asks: 0, spent: 0 })).toBeNull();
    expect(limitMessage({ asks: ASKS_PER_DAY, spent: 0 })).toContain("tomorrow");
    expect(limitMessage({ asks: 1, spent: SHOP_SPEND_PER_DAY })).toContain("tomorrow");
  });
});
