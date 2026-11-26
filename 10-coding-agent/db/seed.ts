import { freshTeam } from "./team";

// bun run setup coding-agent
// The team, with no runs and no model. bun run seed coding-agent adds real runs on top.
const team = await freshTeam();
console.log(`Coding agent team: ${team.size} people`);
process.exit(0);
