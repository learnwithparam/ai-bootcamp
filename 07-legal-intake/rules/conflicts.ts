import type { Conflict } from "./intake";

// A conflict check compares every name in a new request with every party in the firm's past and current matters.
// The firm may not act against its own client, and may not act for someone it has acted against.

export type PartyRecord = { name: string; role: "client" | "adverse"; matter: string };

const SUFFIXES = new Set([
  "ltd",
  "limited",
  "inc",
  "llc",
  "plc",
  "co",
  "company",
  "corp",
  "corporation",
  "the",
]);

export function words(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !SUFFIXES.has(word));
}

function compare(a: string, b: string): "exact" | "possible" | null {
  const left = words(a);
  const right = words(b);
  if (left.length === 0 || right.length === 0) return null;
  if (left.join(" ") === right.join(" ")) return "exact";
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  return shorter.length >= 2 && shorter.every((word) => longer.includes(word)) ? "possible" : null;
}

// The client must never have been on the other side of a matter. The other parties must never have been our client.
export function findConflicts(client: string, others: string[], records: PartyRecord[]): Conflict[] {
  const found: Conflict[] = [];
  const check = (name: string, againstRole: PartyRecord["role"]) => {
    for (const record of records.filter((each) => each.role === againstRole)) {
      const match = compare(name, record.name);
      if (match) found.push({ name, record: record.name, role: record.role, matter: record.matter, match });
    }
  };
  check(client, "adverse");
  for (const other of new Set(others)) check(other, "client");
  return found;
}
