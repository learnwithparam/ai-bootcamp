import { rm } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "@bootcamp/db";
import { loadTables, tablesLoaded } from "../db/load";
import { downloadDataset } from "./download";

// bun run setup (also part of the root setup). Loads the marketplace's records.

async function loadRecords() {
  if (await tablesLoaded()) return console.log("  records: already loaded");
  const folder = await downloadDataset();
  try {
    await loadTables(join(folder, "files"));
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

await loadRecords();
await pool.end();
