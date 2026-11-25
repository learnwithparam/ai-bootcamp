import { pool } from "@bootcamp/db";
import { checkpoints } from "./checkpoints";

// bun run setup runs this once. It creates LangGraph's checkpoint tables. Safe to run again.
await pool.query("create schema if not exists legal_intake_graph");
await checkpoints.setup();
console.log("Checkpoint tables: ok");
console.log("Make yourself a lawyer after you sign up: bun 07-legal-intake/db/lawyer.ts you@example.com");
await pool.end();
