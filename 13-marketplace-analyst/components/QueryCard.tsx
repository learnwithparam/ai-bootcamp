import { Database } from "lucide-react";
import type { Cell, Query } from "../rules/result";

// One query and its rows. The rows come from the database to this table and never go to a model.

const SHOWN = 50;

const show = (cell: Cell) =>
  typeof cell === "number" ? cell.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(cell ?? "-");

function Rows({ query }: { query: Query }) {
  return (
    // A wide result scrolls sideways, so the keyboard must be able to reach it.
    // biome-ignore lint/a11y/noNoninteractiveTabindex: axe asks for a focusable scrolling region
    <section className="table-wrap rows" aria-label="Query result" tabIndex={0}>
      <table className="table">
        <thead>
          <tr>
            {query.columns.map((column) => (
              <th key={column.name} scope="col">
                {column.name.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {query.rows.slice(0, SHOWN).map((row, at) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: result rows have no id and never reorder
            <tr key={at}>
              {row.map((cell, i) => (
                <td key={query.columns[i]?.name} className={typeof cell === "number" ? "num" : undefined}>
                  {show(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const counted = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

export function QueryCard({ query }: { query: Query }) {
  const repaired = query.repairs ? `, after ${counted(query.repairs, "repair")}` : "";
  return (
    <section className="evidence">
      <h2>
        <Database aria-hidden="true" />
        {query.error ? "The query failed" : `Query result, ${counted(query.rows.length, "row")}${repaired}`}
      </h2>
      {query.error ? <p className="form-error">{query.error}</p> : <Rows query={query} />}
      {query.rows.length > SHOWN ? <p className="form-hint">Showing the first {SHOWN} rows.</p> : null}
      <details className="sql">
        <summary>Show the SQL</summary>
        {query.reasoning ? <p>{query.reasoning}</p> : null}
        <pre>{query.sql}</pre>
      </details>
    </section>
  );
}
