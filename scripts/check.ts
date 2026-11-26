import { $ } from "bun";

// bun run check: the gate. Every step must pass with no errors and no warnings.
// It needs Postgres running (bun run setup), because the rules tests use the real database.
// Tests that call the real model run in `bun run proof`, not here.

const steps: [string, () => Promise<unknown>][] = [
  ["Types", () => $`bunx tsc -p .`],
  ["Lint and format", () => $`bunx biome ci --error-on-warnings .`],
  ["Structure", () => $`bun scripts/check-structure.ts`],
  ["Products", () => $`bun scripts/check-products.ts`],
  ["Prose", () => $`bun scripts/check-prose.ts`],
  [
    "Tests",
    () => $`bun test --path-ignore-patterns '**/agent.test.ts' --path-ignore-patterns '**/e2e.test.ts'`,
  ],
];

for (const [name, run] of steps) {
  console.log(`\n== ${name}`);
  await run();
}
console.log("\nAll checks passed.");
