import type { Cell, Query } from "./result";

// The viz agent names a result, two of its columns and a title. It never writes code and never sees a
// value. Code reads the rows. A spec that does not fit the rows draws nothing.

export type ChartKind = "bar" | "line" | "pie" | "scatter";
export type ChartSpec = { kind: ChartKind; query: string; x: string; y: string; title: string };
export type Point = { x: string; y: number };
export type Chart = { kind: ChartKind; title: string; xLabel: string; yLabel: string; points: Point[] };

const MAX_POINTS = { bar: 30, line: 60, pie: 8, scatter: 200 };

function pointsOf(query: Query, spec: ChartSpec): Point[] | undefined {
  const x = query.columns.findIndex((column) => column.name === spec.x);
  const y = query.columns.findIndex((column) => column.name === spec.y);
  if (x < 0 || y < 0 || x === y) return undefined;
  // A scatter plots one number against another.
  if (spec.kind === "scatter" && query.columns[x]?.type !== "number") return undefined;
  const points = query.rows.map((row) => ({ x: String(row[x] as Cell), y: row[y] }));
  const numbers = points.every((point) => typeof point.y === "number" && Number.isFinite(point.y));
  return numbers ? (points as Point[]) : undefined;
}

const label = (name: string) => name.replace(/_/g, " ");

export function chartFrom(spec: ChartSpec, queries: Query[]): Chart | undefined {
  const query = queries.find((each) => each.id === spec.query && !each.error);
  const points = query && pointsOf(query, spec);
  if (!points || points.length < 2 || points.length > MAX_POINTS[spec.kind]) return undefined;
  // A pie shows parts of a whole, so none below zero.
  if (spec.kind === "pie" && points.some((point) => point.y < 0)) return undefined;
  return { kind: spec.kind, title: spec.title, xLabel: label(spec.x), yLabel: label(spec.y), points };
}

// Only a result with a few rows and a number in it can be drawn.
export function chartable(query: Query): boolean {
  if (query.error || query.rows.length < 2 || query.rows.length > MAX_POINTS.scatter) return false;
  return query.columns.some((column, i) => i > 0 && column.type === "number");
}

// Is a chart worth drawing? A grouped result compares things, so yes. A list of records does not.
// Code decides this: asked to, the model said no to a plain ranking about one time in five.
export function worthCharting(query: Query): boolean {
  return chartable(query) && /\bgroup\s+by\b/i.test(query.sql);
}
