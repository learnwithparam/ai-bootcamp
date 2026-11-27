import type { Cell, Query } from "./result";

// Which result values turned up in a prompt? A value the model could know without the rows does not
// count: one in the question, the schema's documentation or a query it wrote (passed in as `known`).
// Very short values (1, 5, SP) occur in any text, so only distinctive ones are looked for.

function distinctive(cell: Cell): cell is string | number {
  if (typeof cell === "number") return String(cell).replace(/\D/g, "").length >= 4;
  return typeof cell === "string" && cell.length >= 4;
}

function spellings(value: string | number): string[] {
  const plain = String(value).toLowerCase();
  return typeof value === "number" ? [plain, value.toLocaleString("en-US").toLowerCase()] : [plain];
}

export function leaksIn(prompts: string[], queries: Query[], known: string[]): string[] {
  const allowed = known.join("\n").toLowerCase();
  const sent = prompts.join("\n").toLowerCase();
  const cells = queries.flatMap((query) => query.rows.flat()).filter(distinctive);
  const leaked = cells.filter((cell) =>
    spellings(cell).some((text) => sent.includes(text) && !allowed.includes(text)),
  );
  return [...new Set(leaked.map(String))];
}
