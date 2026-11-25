import { afterAll, expect, test } from "bun:test";
import { pausedAt, resumeIntake, startIntake } from "../agent/agent";
import { collect, OPENING } from "../agent/collect";
import { checkpoints } from "../db/checkpoints";
import { intakeById, removeIntakes, takeRequest } from "../db/queries";
import { EMPTY_DRAFT, missing } from "../rules/collect";
import { whyNotTake } from "../rules/form";
import type { Decision, Request, Turn } from "../rules/intake";

// The real graph and the real model, saved to a real Postgres. Runs in `bun run proof`. Needs `bun run setup` first,
// which loads the firm's records the conflict check reads.
// The metric on the learner page: the model's reading is kept only where the story backs it, a conflict the model
// found in the story blocks an accept, and the client reads only the letter a lawyer approved.

const made: string[] = [];
afterAll(async () => {
  await removeIntakes(made);
  for (const id of made) await checkpoints.deleteThread(id);
});

// What the client typed becomes the transcript and the story, as the intake page sends it.
async function send(fields: Omit<Request, "keyDate" | "goal" | "transcript">) {
  const request: Request = {
    ...fields,
    keyDate: null,
    goal: "A reply from a lawyer",
    transcript: [{ from: "client", text: fields.story }],
  };
  const taken = await takeRequest(request, whyNotTake);
  if (!("id" in taken)) throw new Error(taken.refused);
  made.push(taken.id);
  await startIntake(taken.id, request);
  return taken.id;
}

const decide = (choice: Decision["choice"]): Decision => ({
  choice,
  note: "",
  clearedPossible: false,
  lawyerId: "proof",
});
const email = () => `proof-${crypto.randomUUID()}@example.com`;

test("a tenancy request with a deadline: read, decided, drafted, approved", async () => {
  const id = await send({
    clientName: "Ana Silva",
    clientEmail: email(),
    otherParties: ["Greenway Homes"],
    story:
      "I rented a flat from Greenway Homes for two years. When I moved out they kept my whole deposit of 900 pounds " +
      "and say the carpets were damaged, but they were already worn when I moved in and I have photos. " +
      "They told me I have until 12 December 2026 to accept a deduction or they will start a court claim.",
  });
  let intake = await intakeById(id);
  expect(intake?.status).toBe("needs review");
  expect(intake?.assessment?.area).toBe("tenancy");
  expect(intake?.assessment?.deadline?.quote).toBeTruthy();
  expect(intake?.conflicts).toEqual([]);

  await resumeIntake(id, decide("accept"));
  const pause = await pausedAt(id);
  if (pause?.kind !== "approve") throw new Error("The letter is not waiting for approval.");
  expect(pause.draft).toContain("Ana");
  expect(pause.draft).toMatch(/12 December|2026-12-12|12\/12/);

  const edited = `${pause.draft}\n\nPS from your lawyer: please bring the photos.`;
  await resumeIntake(id, edited);
  intake = await intakeById(id);
  expect(intake?.status).toBe("answered");
  expect(intake?.letter).toBe(edited.trim());
  expect(intake?.cost).toBeLessThan(0.05);
  console.log(`Answered for $${intake?.cost.toFixed(4)}, deadline ${intake?.assessment?.deadline?.date}`);
}, 120_000);

test("a conflict the client never typed, found in the story, blocks an accept", async () => {
  const id = await send({
    clientName: "Tom Reyes",
    clientEmail: email(),
    otherParties: ["Greenway Homes"],
    story:
      "My landlord Greenway Homes has not fixed a leak in my bedroom for four months. The letting agent, " +
      "Marcus Bell, told me in writing that repairs are my problem and that I should stop complaining.",
  });
  let intake = await intakeById(id);
  expect(intake?.assessment?.otherParties).toContain("Marcus Bell");
  expect(intake?.conflicts.map((conflict) => [conflict.record, conflict.match])).toEqual([
    ["Marcus Bell", "exact"],
  ]);

  // The page refuses this first. Here the graph is asked directly, and refuses too, then waits again.
  await resumeIntake(id, decide("accept"));
  expect((await pausedAt(id))?.refused).toContain("must be declined");

  await resumeIntake(id, decide("decline"));
  const pause = await pausedAt(id);
  if (pause?.kind !== "approve") throw new Error("The decline letter is not waiting for approval.");
  expect(pause.draft.toLowerCase()).not.toContain("conflict");
  expect(pause.draft).not.toContain("Marcus Bell");
  intake = await intakeById(id);
  expect(intake?.decision?.choice).toBe("decline");

  // A lawyer who types the name in by hand is refused too, and the letter still waits.
  await resumeIntake(id, `${pause.draft}\n\nWe act for Marcus Bell.`);
  expect((await pausedAt(id))?.refused).toContain("Take out");
}, 120_000);

test("the conversation fills the form from the client's words, and asks for what is still missing", async () => {
  const transcript: Turn[] = [
    OPENING,
    {
      from: "client",
      text:
        "Hi, I'm Lena Marsh. I cancelled my gym membership with Quayside Fitness Ltd in August with 30 days notice, " +
        "but they still take 45 pounds a month. They told me the debt goes to a collector on 9 January 2027.",
    },
  ];
  const first = await collect(transcript, EMPTY_DRAFT, []);
  expect(first.draft.clientName).toBe("Lena Marsh");
  expect(first.draft.otherParties).toEqual(["Quayside Fitness Ltd"]);
  expect(first.draft.keyDate?.date).toBe("2027-01-09");
  expect(first.draft.clientEmail).toBe("");
  expect(first.reply.trim()).toMatch(/\?$/);

  const edited = { ...first.draft, clientName: "Lena M. Marsh" };
  const second = await collect(
    [
      ...transcript,
      { from: "agent", text: first.reply },
      { from: "client", text: "lena.marsh@example.com, and I want my money back." },
    ],
    edited,
    ["clientName"],
  );
  expect(second.draft.clientName).toBe("Lena M. Marsh");
  expect(second.draft.clientEmail).toBe("lena.marsh@example.com");
  expect(missing(second.draft)).toEqual([]);
  expect(first.cost + second.cost).toBeLessThan(0.01);
  console.log(`Two intake turns for $${(first.cost + second.cost).toFixed(4)}`);
}, 60_000);
