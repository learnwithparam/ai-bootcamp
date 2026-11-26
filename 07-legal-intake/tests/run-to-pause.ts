import type { State } from "../agent/graph";
import { intakeGraph } from "../agent/graph";

// Used by pause.test.ts. A separate process: it runs the graph up to the lawyer's pause, then exits.
// The steps before the pause are placed as if they had run, so no model is called.
// bun 07-legal-intake/tests/run-to-pause.ts <thread id> <json of request, assessment, conflicts>

const [id, json] = process.argv.slice(2);
if (!id || !json) throw new Error("Usage: run-to-pause.ts <id> <state json>");
const config = { configurable: { thread_id: id } };
await intakeGraph.updateState(config, JSON.parse(json) as Partial<State>, "checkConflicts");
await intakeGraph.invoke(null, config);
process.exit(0);
