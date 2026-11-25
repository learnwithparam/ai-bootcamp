import { researchGraph } from "./agent/graph";

const t0 = Date.now();
const out = await researchGraph.invoke({ company: process.argv[2] ?? "Linear", today: "2026-11-25" });
console.log("identity", out.identity, "secs", (Date.now() - t0) / 1000, "cost", out.cost.toFixed(4));
for (const c of out.checked ?? [])
  console.log(c.check.padEnd(10), c.id, c.sourceUrl.slice(0, 70), "|", c.quote.slice(0, 60));
console.log(JSON.stringify(out.score));
