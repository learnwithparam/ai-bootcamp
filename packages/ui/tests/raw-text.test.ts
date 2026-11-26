import { expect, test } from "bun:test";
import { toolLabel } from "../parts";
import { rawTextProblem } from "../raw-text";

test("raw markdown and raw tool ids are caught", () => {
  expect(rawTextProblem("## Upcoming live labs")).toContain("raw markdown");
  expect(rawTextProblem("Read [the guide](https://example.com)")).toContain("raw markdown");
  expect(rawTextProblem("This is **bold**")).toContain("raw markdown");
  expect(rawTextProblem("Run it after `bun run cli login`.")).toContain("raw markdown");
  expect(rawTextProblem("Called learnwithparam__search_catalog")).toContain("tool id");
  expect(rawTextProblem("2026-11-25 16:21\n__start__ finished")).toContain("tool id");
});

test("ordinary page text passes", () => {
  expect(rawTextProblem("Invoice #10250\nTotal $42.40\nC# and F# courses")).toBeUndefined();
  expect(rawTextProblem("Search catalog, from learnwithparam")).toBeUndefined();
});

test("a tool id becomes a label a person can read", () => {
  expect(toolLabel("learnwithparam__search_catalog")).toEqual({
    label: "Search catalog",
    source: "learnwithparam",
  });
  expect(toolLabel("findOrders")).toEqual({ label: "Find orders" });
});
