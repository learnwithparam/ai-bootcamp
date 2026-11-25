import { checkpoints } from "../db/checkpoints";
import { claim, queue, removeIntakes, takeRequest } from "../db/queries";
import { type Decision, isDate, type Request } from "../rules/intake";
import { pausedAt, resumeIntake, startIntake } from "./agent";
import { type SeedStory, STORIES } from "./seed-stories";

// bun run seed legal-intake
// Sends a dozen requests through the real graph and the real model, so the intake board has work on it:
// most wait for a lawyer, one letter waits for approval, and a few are answered.
// Running it again replaces the seeded requests. It costs about one cent.

const DOMAIN = "@seed.harlow-legal.example";

function toRequest(seed: SeedStory): Request {
  const date = seed.quote?.match(/\d{1,2} \w+ \d{4}/)?.[0];
  const iso = date ? new Date(`${date} 12:00 UTC`).toISOString().slice(0, 10) : "";
  const opening = { from: "agent" as const, text: "Tell me what happened, in your own words." };
  return {
    clientName: seed.name,
    clientEmail: `${seed.name.toLowerCase().replace(/\W+/g, ".")}${DOMAIN}`,
    otherParties: seed.others,
    keyDate: seed.quote && isDate(iso) ? { date: iso, quote: seed.quote } : null,
    goal: seed.goal,
    story: seed.story,
    transcript: [opening, { from: "client", text: seed.story }],
  };
}

const decision = (choice: Decision["choice"], note: string): Decision => ({
  choice,
  note,
  clearedPossible: false,
  lawyerId: "seed",
});

// Moves a request on the way a lawyer would: decide, then approve the draft as written.
async function playLawyer(id: string, stage: SeedStory["stage"]) {
  if (stage === "review") return;
  const choice = stage === "declined" ? "decline" : "accept";
  const note = choice === "decline" ? "We do not handle family matters. Suggest a family law firm." : "";
  if (!(await claim(id, "needs review", "drafting")))
    return console.log(`  ${id} was not waiting for a decision`);
  await resumeIntake(id, decision(choice, note));
  if (stage === "letter") return;
  const pause = await pausedAt(id);
  if (pause?.kind !== "approve" || !(await claim(id, "letter ready", "sending"))) return;
  await resumeIntake(id, pause.draft);
}

async function seed(story: SeedStory) {
  const request = toRequest(story);
  const taken = await takeRequest(request, () => null);
  if (!("id" in taken)) throw new Error(taken.refused);
  await startIntake(taken.id, request);
  await playLawyer(taken.id, story.stage);
  console.log(`  ${story.name}: ${story.stage}`);
}

const old = (await queue(1_000))
  .filter((intake) => intake.clientEmail.endsWith(DOMAIN))
  .map((intake) => intake.id);
await removeIntakes(old);
for (const id of old) await checkpoints.deleteThread(id);

console.log(`Intake requests through the real graph: ${STORIES.length}`);
for (let start = 0; start < STORIES.length; start += 4) {
  await Promise.all(STORIES.slice(start, start + 4).map(seed));
}
process.exit(0);
