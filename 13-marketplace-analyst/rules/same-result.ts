import type { Cell } from "./result";

// SQL execution accuracy: two queries are the same answer when they return the same values, whatever
// the column names, column order or row order. Extra columns in the agent's result are allowed.

const norm = (cell: Cell): string =>
  typeof cell === "number" ? String(Number(cell.toPrecision(3))) : String(cell).trim().toLowerCase();

const column = (rows: Cell[][], i: number) => rows.map((row) => norm(row[i] ?? null));

const sorted = (values: string[]) => JSON.stringify([...values].sort());

// For each column of the right answer, the first unused column of the agent's that holds the same values.
function matchColumns(gold: Cell[][], got: Cell[][]): number[] | undefined {
  const used: number[] = [];
  for (let g = 0; g < (gold[0]?.length ?? 0); g++) {
    const want = sorted(column(gold, g));
    const width = got[0]?.length ?? 0;
    const match = [...Array(width).keys()].find((i) => !used.includes(i) && sorted(column(got, i)) === want);
    if (match === undefined) return undefined;
    used.push(match);
  }
  return used;
}

export function sameResult(gold: Cell[][], got: Cell[][]): boolean {
  if (gold.length !== got.length) return false;
  const columns = matchColumns(gold, got);
  if (!columns) return false;
  // Same values per column is not enough: each row must pair the same values together.
  const goldRows = gold.map((row) => JSON.stringify(row.map(norm)));
  const gotRows = got.map((row) => JSON.stringify(columns.map((i) => norm(row[i] ?? null))));
  return sorted(goldRows) === sorted(gotRows);
}
