import { freshDesk } from "./desk";

// bun run setup browser-agent
// The intake desk and its inbox, with no runs and no model. bun run seed browser-agent adds real runs on top.
const desk = await freshDesk();
console.log(`Intake desk: ${desk.people.size} people, ${desk.emails.size} emails`);
process.exit(0);
