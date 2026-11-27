import { expect, test } from "bun:test";
import { PRODUCTS } from "@bootcamp/products";
import { checkSyllabus } from "./check-syllabus";
import { buildSyllabus } from "./emit-syllabus";
import { validateSyllabus } from "./syllabus-shape";

const SHA = "0".repeat(40);

test("the emitted syllabus has week zero, one week per product, and passes the shape", () => {
  const syllabus = buildSyllabus(SHA);
  expect(validateSyllabus(syllabus)).toEqual([]);
  expect(syllabus.tree.modules.map((m) => m.key)).toEqual(
    Array.from({ length: PRODUCTS.length + 1 }, (_, i) => `w${String(i).padStart(2, "0")}`),
  );
});

test("each product has a reading and a lab with a proof and the cohort rubric", () => {
  for (const module of buildSyllabus(SHA).tree.modules.slice(1)) {
    const items = module.units[0]?.items ?? [];
    expect(items.map((i) => i.kind)).toEqual(["reading", "lab"]);
    expect(items[1]?.proof?.kind).toBe("github-check");
    expect(items[1]?.rubric_key).toBe("cohort");
  }
});

test("the validator rejects bad keys, extra fields, and an empty tree", () => {
  const bad = buildSyllabus(SHA);
  const item = bad.tree.modules[1]?.units[0]?.items[0] as Record<string, unknown>;
  item.key = "Bad Key";
  item.extra = 1;
  const problems = validateSyllabus(bad).join("\n");
  expect(problems).toContain("bad key");
  expect(problems).toContain('"extra" is not allowed');
  expect(validateSyllabus({})).not.toEqual([]);
});

test("the committed syllabus.json is valid and current", () => {
  expect(checkSyllabus()).toEqual([]);
});
