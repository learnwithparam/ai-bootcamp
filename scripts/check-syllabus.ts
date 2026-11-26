import { existsSync, readFileSync } from "node:fs";
import { buildSyllabus, gitSha, OUTPUT, render, type Syllabus } from "./emit-syllabus";
import { validateSyllabus } from "./syllabus-shape";

// The gate step: syllabus.json must be valid and must match what the emitter writes now.
// The file cannot hold the commit that contains it, so the sha is checked for form, not for equality.

export function checkSyllabus(): string[] {
  if (!existsSync(OUTPUT)) return [`${OUTPUT} is missing. Run: bun run syllabus`];
  const text = readFileSync(OUTPUT, "utf8");
  let committed: Syllabus;
  try {
    committed = JSON.parse(text);
  } catch (error) {
    console.error(error);
    return [`${OUTPUT} is not valid JSON: ${error}`];
  }
  const invalid = validateSyllabus(committed);
  if (invalid.length > 0) return invalid.map((problem) => `${OUTPUT}: ${problem}`);
  if (!/^[0-9a-f]{40}$/.test(committed.source.sha)) return [`${OUTPUT}: source.sha is not a git sha.`];
  const fresh = render(buildSyllabus(committed.source.sha));
  return fresh === text ? [] : [`${OUTPUT} is stale. Run: bun run syllabus, then commit it.`];
}

if (import.meta.main) {
  const problems = checkSyllabus();
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exit(1);
  console.log(`${OUTPUT} is current (sha ${gitSha().slice(0, 7)} at build time is not compared).`);
}
