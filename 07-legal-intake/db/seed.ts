import type { PartyRecord } from "../rules/conflicts";
import { db } from "./queries";
import { parties } from "./schema";

// bun run seed legal-intake
// The firm's own records: who it has acted for (client) and against (adverse), and on which matter.
// The conflict check compares every new request with these. Running it again replaces them.

const RECORDS: PartyRecord[] = [
  { name: "Northwind Logistics Ltd", role: "client", matter: "M-2024-031 supplier contract" },
  { name: "Greenhill Property Management", role: "client", matter: "M-2025-007 lease renewals" },
  { name: "Aurora Dental Group", role: "client", matter: "M-2025-019 staff contracts" },
  { name: "Priya Raman", role: "client", matter: "M-2025-044 unfair dismissal" },
  { name: "Marcus Bell", role: "client", matter: "M-2026-002 deposit dispute" },
  { name: "Halcyon Gyms Ltd", role: "adverse", matter: "M-2025-051 membership refunds" },
  { name: "Daniel Okafor", role: "adverse", matter: "M-2026-011 tenancy arrears" },
  { name: "Brightline Telecom", role: "adverse", matter: "M-2026-014 mis-sold contract" },
  { name: "Sofia Marin", role: "adverse", matter: "M-2026-020 workplace grievance" },
];

await db.transaction(async (tx) => {
  await tx.delete(parties);
  await tx.insert(parties).values(RECORDS);
});
console.log(`Firm records: ${RECORDS.length} parties`);
process.exit(0);
