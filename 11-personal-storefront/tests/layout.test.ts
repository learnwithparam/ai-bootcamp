import { describe, expect, test } from "bun:test";
import { checkSection, defaultLayout, recheck } from "../rules/layout";
import { NEW_PROFILE, whyNot, withAllergen } from "../rules/profile";
import { SECTION_TYPES } from "../rules/sections";
import { visibleSections } from "../rules/view";
import { ALL, PEANUTS, SHELF } from "./shelf";

// The last word on what the agent asks for: each section checked against the shopper, with no model.

describe("checking the agent's sections", () => {
  const ALLOWED = [...SECTION_TYPES];

  test("a product the shopper avoids is taken out of a row, whatever the agent asked for", () => {
    const raw = {
      type: "productRow",
      title: "For you",
      reason: "You like breakfast",
      codes: ["1", "2", "3", "5", "6"],
    };
    const { section, removed } = checkSection(raw, "s1", SHELF, PEANUTS, ALLOWED);
    expect(section?.type === "productRow" && section.products.map((one) => one.code)).toEqual([
      "1",
      "5",
      "6",
    ]);
    expect(removed.map((one) => one.why)).toEqual(["contains peanuts", "may contain peanuts"]);
  });

  test("a row left with too few products is dropped, and an invented code is reported", () => {
    const raw = { type: "productRow", title: "For you", reason: "Picked", codes: ["2", "3", "999", "5"] };
    const checked = checkSection(raw, "s1", SHELF, PEANUTS, ALLOWED);
    expect(checked.section).toBeNull();
    expect(checked.dropped).toBe("only 1 products left after the rules");
    expect(checked.removed.some((one) => one.why === "not a product we sell")).toBe(true);
  });

  test("a section the merchandiser turned off, or one the page cannot draw, is never drawn", () => {
    const hero = { type: "hero", headline: "Breakfast", subline: "Start well", code: "1" };
    expect(checkSection(hero, "h", SHELF, NEW_PROFILE, ["productRow"]).dropped).toBe(
      "hero is turned off by the merchandiser",
    );
    expect(checkSection({ type: "carousel", codes: ["1"] }, "x", SHELF, NEW_PROFILE, ALLOWED).dropped).toBe(
      "not a section the page can draw",
    );
  });
});

describe("the page after the shopper changes something", () => {
  const ALLOWED = [...SECTION_TYPES];

  test("a saved page is checked again after the shopper adds an allergy", () => {
    const page = defaultLayout(ALL, NEW_PROFILE);
    const shown = recheck(page, SHELF, PEANUTS).flatMap((one) =>
      one.type === "hero" ? [one.product] : one.type === "filterBar" ? [] : one.products,
    );
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.filter((one) => whyNot(one, PEANUTS))).toEqual([]);
  });

  test("the browser hides a product at once when a chip is added, and the aisle bar narrows the rows", () => {
    const raw = {
      type: "productRow",
      title: "Picked for you",
      reason: "Popular",
      codes: ["1", "2", "3", "5", "6"],
    };
    const row = checkSection(raw, "row", SHELF, NEW_PROFILE, ALLOWED).section;
    const page = row ? [row] : [];
    const codes = (sections: ReturnType<typeof visibleSections>) =>
      sections.flatMap((one) => (one.type === "productRow" ? one.products.map((p) => p.code) : []));
    expect(codes(visibleSections(page, NEW_PROFILE, null))).toContain("2");
    expect(codes(visibleSections(page, withAllergen(NEW_PROFILE, "peanuts"), null))).not.toContain("2");
    expect(codes(visibleSections(page, NEW_PROFILE, "breakfast"))).toEqual(["1", "3"]);
  });
});

describe("names on the page", () => {
  const ALLOWED = [...SECTION_TYPES];

  test("a section with the same title as one above it is dropped, so no two sections share a name", () => {
    const bundle = { type: "bundle", title: "Pasta night", reason: "Dinner for two", codes: ["1", "5"] };
    const first = checkSection(bundle, "b", SHELF, NEW_PROFILE, ALLOWED).section;
    const recipe = { type: "recipeCard", title: "Pasta Night", steps: ["Boil", "Stir"], codes: ["1", "5"] };
    expect(checkSection(recipe, "r", SHELF, NEW_PROFILE, ALLOWED, first ? [first] : []).dropped).toBe(
      "the same title as a section above it",
    );
  });
});
