import type { Cell, ColumnType } from "./result";

// node-postgres gives exact numbers and counts as text, and dates as objects. A table, a chart and a
// comparison all need plain values and a plain type.

const NUMBER_TYPES = new Set([20, 21, 23, 700, 701, 1700]);
const DATE_TYPES = new Set([1082, 1114, 1184]);
const BOOLEAN = 16;

export function typeOf(typeId: number): ColumnType {
  if (NUMBER_TYPES.has(typeId)) return "number";
  if (DATE_TYPES.has(typeId)) return "date";
  return typeId === BOOLEAN ? "boolean" : "text";
}

export function toCell(value: unknown, typeId: number): Cell {
  if (value === null || value === undefined) return null;
  if (NUMBER_TYPES.has(typeId)) return Number(value);
  if (value instanceof Date) {
    const text = value.toISOString().slice(0, 19).replace("T", " ");
    return text.replace(" 00:00:00", "");
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  return JSON.stringify(value);
}
