// Postgres quotes the offending value in some errors ("invalid input syntax for type integer: ..."), and
// the error agent reads the error. Anything quoted that the SQL did not already contain is blanked.

const QUOTED = /"([^"]*)"|'([^']*)'/g;

export function safeError(message: string, sql: string): string {
  const known = sql.toLowerCase();
  const firstLine = message.split("\n")[0] ?? "";
  return firstLine.replace(QUOTED, (whole, double?: string, single?: string) => {
    const inner = (double ?? single ?? "").toLowerCase();
    return inner && known.includes(inner) ? whole : '"..."';
  });
}
