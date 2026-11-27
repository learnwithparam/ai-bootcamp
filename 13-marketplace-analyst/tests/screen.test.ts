import { describe, expect, test } from "bun:test";
import { HEIGHT, LEFT, linePoints, lineTicks, scatterPoints, slices, WIDTH } from "../rules/chart-geometry";

// Where the chart's marks go, with no model and no browser.

describe("the chart's geometry", () => {
  test("a line spans the width, with zero at the bottom", () => {
    const [low, high] = linePoints([
      { x: "a", y: 0 },
      { x: "b", y: 10 },
    ]);
    expect(low).toEqual({ x: LEFT, y: HEIGHT - 8 });
    expect(high).toEqual({ x: WIDTH - 8, y: 8 });
  });

  test("a line's gridlines run from zero to a round number above the values", () => {
    const months = [
      { x: "2018-01", y: 7269 },
      { x: "2018-02", y: 6167 },
    ];
    expect(lineTicks(months).map((tick) => tick.value)).toEqual([7500, 3750, 0]);
    expect(linePoints(months)[0]?.y).toBeGreaterThan(8);
  });

  test("a scatter places each point by both of its numbers", () => {
    const [low, high] = scatterPoints([
      { x: "0", y: 0 },
      { x: "10", y: 10 },
    ]);
    expect(low).toEqual({ x: LEFT, y: HEIGHT - 8 });
    expect(high).toEqual({ x: WIDTH - 8, y: 8 });
  });

  test("a pie's shares add up to the whole", () => {
    const pie = slices([
      { x: "card", y: 3 },
      { x: "boleto", y: 1 },
    ]);
    expect(pie.map((slice) => slice.share)).toEqual([0.75, 0.25]);
    expect(pie[0]?.d).toStartWith("M0 0 L0.00 -100.00 A100 100 0 1 1");
  });
});
